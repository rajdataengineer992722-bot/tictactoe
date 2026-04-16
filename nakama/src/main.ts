const TICK_RATE = 1;
const MOVE_TIMEOUT_SEC = 30;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 2;

const OPCODE_MOVE = 1;
const OPCODE_STATE = 2;
const OPCODE_STATE_REQUEST = 3;
const OPCODE_ERROR = 4;

const LEADERBOARD_ID = "tic_tac_toe_ranked";

type Mark = "X" | "O";
type Cell = Mark | null;
type MatchStatus = "waiting" | "playing" | "winner" | "draw" | "forfeit";

interface PlayerState {
  userId: string;
  sessionId: string;
  username: string;
  mark: Mark;
  connected: boolean;
  wins: number;
  losses: number;
  streak: number;
}

interface MatchState {
  board: Cell[];
  players: Record<string, PlayerState>;
  marks: Partial<Record<Mark, string>>;
  turn: Mark;
  status: MatchStatus;
  winner: Mark | null;
  winningLine: number[] | null;
  moveDeadlineSec: number;
  nextDeadlineSec: number;
  createdAtSec: number;
  lastMoveAtSec: number;
  emptyTicks: number;
}

interface MovePayload {
  cell: number;
}

interface PublicState {
  board: Cell[];
  players: PlayerState[];
  turn: Mark;
  status: MatchStatus;
  winner: Mark | null;
  winningLine: number[] | null;
  moveDeadlineSec: number;
  serverTimeSec: number;
}

const winningLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function InitModule(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, initializer: nkruntime.Initializer) {
  try {
    nk.leaderboardCreate(LEADERBOARD_ID, true, "desc", "best", "0 0 * * 1", {});
  } catch (error) {
    logger.info("Leaderboard already exists or could not be created: %q", error);
  }

  initializer.registerMatch("tic_tac_toe", {
    matchInit,
    matchJoinAttempt,
    matchJoin,
    matchLeave,
    matchLoop,
    matchTerminate,
    matchSignal,
  });

  initializer.registerMatchmakerMatched(matchmakerMatched);
  initializer.registerRpc("leaderboard", rpcLeaderboard);
  logger.info("Tic-Tac-Toe authoritative runtime loaded.");
}

function matchmakerMatched(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, matches: nkruntime.MatchmakerResult[]): string {
  const matchId = nk.matchCreate("tic_tac_toe", {
    expectedPlayers: matches.map((candidate) => ({
      userId: candidate.presence.userId,
      username: candidate.presence.username,
    })),
  });

  logger.info("Created Tic-Tac-Toe match %s for %d players.", matchId, matches.length);
  return matchId;
}

function matchInit(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, params: Record<string, unknown>): { state: MatchState; tickRate: number; label: string } {
  const now = Math.floor(Date.now() / 1000);
  const state: MatchState = {
    board: Array<Cell>(9).fill(null),
    players: {},
    marks: {},
    turn: "X",
    status: "waiting",
    winner: null,
    winningLine: null,
    moveDeadlineSec: MOVE_TIMEOUT_SEC,
    nextDeadlineSec: now + MOVE_TIMEOUT_SEC,
    createdAtSec: now,
    lastMoveAtSec: now,
    emptyTicks: 0,
  };

  return {
    state,
    tickRate: TICK_RATE,
    label: JSON.stringify({ game: "tic_tac_toe", open: true }),
  };
}

function matchJoinAttempt(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: MatchState, presence: nkruntime.Presence): { state: MatchState; accept: boolean; rejectMessage?: string } | null {
  const existingPlayer = state.players[presence.userId];
  const playerCount = Object.keys(state.players).length;

  if (existingPlayer) {
    return { state, accept: true };
  }

  if (playerCount >= MAX_PLAYERS) {
    return { state, accept: false, rejectMessage: "This room is already full." };
  }

  if (state.status !== "waiting") {
    return { state, accept: false, rejectMessage: "This match is already in progress." };
  }

  return { state, accept: true };
}

function matchJoin(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: MatchState, presences: nkruntime.Presence[]): { state: MatchState } | null {
  for (const presence of presences) {
    const existingPlayer = state.players[presence.userId];
    if (existingPlayer) {
      existingPlayer.sessionId = presence.sessionId;
      existingPlayer.connected = true;
      continue;
    }

    const mark = state.marks.X ? "O" : "X";
    state.players[presence.userId] = {
      userId: presence.userId,
      sessionId: presence.sessionId,
      username: presence.username || "Player",
      mark,
      connected: true,
      wins: 0,
      losses: 0,
      streak: 0,
    };
    state.marks[mark] = presence.userId;
  }

  if (Object.keys(state.players).length === MIN_PLAYERS && state.status === "waiting") {
    const now = Math.floor(Date.now() / 1000);
    state.status = "playing";
    state.nextDeadlineSec = now + MOVE_TIMEOUT_SEC;
    state.lastMoveAtSec = now;
  }

  broadcastState(dispatcher, state);
  return { state };
}

function matchLeave(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: MatchState, presences: nkruntime.Presence[]): { state: MatchState } | null {
  for (const presence of presences) {
    const player = state.players[presence.userId];
    if (player) {
      player.connected = false;
    }
  }

  if (state.status === "playing") {
    const connectedPlayers = Object.values(state.players).filter((player) => player.connected);
    if (connectedPlayers.length === 1) {
      finishGame(nk, state, connectedPlayers[0].mark, "forfeit");
    }
  }

  broadcastState(dispatcher, state);
  return { state };
}

function matchLoop(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: MatchState, messages: nkruntime.MatchMessage[]): { state: MatchState } | null {
  const now = Math.floor(Date.now() / 1000);

  for (const message of messages) {
    if (message.opCode === OPCODE_MOVE) {
      handleMove(nk, dispatcher, state, message, now);
    }

    if (message.opCode === OPCODE_STATE_REQUEST) {
      dispatcher.broadcastMessage(OPCODE_STATE, JSON.stringify(toPublicState(state)), [message.sender]);
    }
  }

  if (state.status === "playing" && now >= state.nextDeadlineSec) {
    const currentUserId = state.marks[state.turn];
    const winner = state.turn === "X" ? "O" : "X";
    if (currentUserId && state.marks[winner]) {
      finishGame(nk, state, winner, "forfeit");
      broadcastState(dispatcher, state);
    }
  }

  if (Object.keys(state.players).length === 0) {
    state.emptyTicks += 1;
  } else {
    state.emptyTicks = 0;
  }

  if (state.emptyTicks > 30 || isTerminal(state.status) && state.emptyTicks > 5) {
    return null;
  }

  return { state };
}

function matchTerminate(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: MatchState, graceSeconds: number): { state: MatchState } | null {
  broadcastState(dispatcher, state);
  return { state };
}

function matchSignal(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: MatchState, data: string): { state: MatchState; data?: string } | null {
  return { state, data: JSON.stringify(toPublicState(state)) };
}

function handleMove(nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, state: MatchState, message: nkruntime.MatchMessage, now: number): void {
  if (state.status !== "playing") {
    sendError(dispatcher, message.sender, "The game is not accepting moves.");
    return;
  }

  const player = state.players[message.sender.userId];
  if (!player) {
    sendError(dispatcher, message.sender, "You are not part of this match.");
    return;
  }

  if (player.mark !== state.turn) {
    sendError(dispatcher, message.sender, "It is not your turn.");
    return;
  }

  let payload: MovePayload;
  try {
    payload = JSON.parse(nk.binaryToString(message.data));
  } catch {
    sendError(dispatcher, message.sender, "Invalid move payload.");
    return;
  }

  if (!Number.isInteger(payload.cell) || payload.cell < 0 || payload.cell > 8) {
    sendError(dispatcher, message.sender, "Cell must be a number from 0 to 8.");
    return;
  }

  if (state.board[payload.cell] !== null) {
    sendError(dispatcher, message.sender, "That cell is already occupied.");
    return;
  }

  state.board[payload.cell] = player.mark;
  state.lastMoveAtSec = now;

  const result = evaluateBoard(state.board);
  if (result.winner) {
    state.winningLine = result.line;
    finishGame(nk, state, result.winner, "winner");
  } else if (state.board.every(Boolean)) {
    finishDraw(nk, state);
  } else {
    state.turn = state.turn === "X" ? "O" : "X";
    state.nextDeadlineSec = now + MOVE_TIMEOUT_SEC;
  }

  broadcastState(dispatcher, state);
}

function evaluateBoard(board: Cell[]): { winner: Mark | null; line: number[] | null } {
  for (const line of winningLines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }

  return { winner: null, line: null };
}

function finishGame(nk: nkruntime.Nakama, state: MatchState, winner: Mark, status: "winner" | "forfeit"): void {
  state.status = status;
  state.winner = winner;
  state.nextDeadlineSec = 0;

  for (const player of Object.values(state.players)) {
    if (player.mark === winner) {
      player.wins += 1;
      player.streak += 1;
      writeLeaderboard(nk, player, 1);
    } else {
      player.losses += 1;
      player.streak = 0;
      writeLeaderboard(nk, player, 0);
    }
  }
}

function finishDraw(nk: nkruntime.Nakama, state: MatchState): void {
  state.status = "draw";
  state.winner = null;
  state.nextDeadlineSec = 0;

  for (const player of Object.values(state.players)) {
    writeLeaderboard(nk, player, 0);
  }
}

function writeLeaderboard(nk: nkruntime.Nakama, player: PlayerState, won: 0 | 1): void {
  const score = player.wins * 3 + player.streak;
  const metadata = {
    username: player.username,
    wins: player.wins,
    losses: player.losses,
    streak: player.streak,
    lastResult: won ? "win" : "loss_or_draw",
  };

  nk.leaderboardRecordWrite(LEADERBOARD_ID, player.userId, player.username, score, player.wins, metadata);
}

function broadcastState(dispatcher: nkruntime.MatchDispatcher, state: MatchState): void {
  dispatcher.broadcastMessage(OPCODE_STATE, JSON.stringify(toPublicState(state)));
}

function sendError(dispatcher: nkruntime.MatchDispatcher, presence: nkruntime.Presence, message: string): void {
  dispatcher.broadcastMessage(OPCODE_ERROR, JSON.stringify({ message }), [presence]);
}

function toPublicState(state: MatchState): PublicState {
  return {
    board: state.board,
    players: Object.values(state.players),
    turn: state.turn,
    status: state.status,
    winner: state.winner,
    winningLine: state.winningLine,
    moveDeadlineSec: state.nextDeadlineSec,
    serverTimeSec: Math.floor(Date.now() / 1000),
  };
}

function isTerminal(status: MatchStatus): boolean {
  return status === "winner" || status === "draw" || status === "forfeit";
}

function rpcLeaderboard(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const result = nk.leaderboardRecordsList(LEADERBOARD_ID, [], 25, undefined, 0);
  return JSON.stringify({
    records: result.records.map((record: any) => ({
      ownerId: record.ownerId,
      username: record.username,
      score: record.score,
      subscore: record.subscore,
      metadata: record.metadata,
    })),
  });
}
