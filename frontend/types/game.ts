export type Mark = "X" | "O";
export type Cell = Mark | null;
export type MatchStatus = "waiting" | "playing" | "winner" | "draw" | "forfeit";

export interface PlayerState {
  userId: string;
  sessionId: string;
  username: string;
  mark: Mark;
  connected: boolean;
  wins: number;
  losses: number;
  streak: number;
}

export interface GameState {
  board: Cell[];
  players: PlayerState[];
  turn: Mark;
  status: MatchStatus;
  winner: Mark | null;
  winningLine: number[] | null;
  moveDeadlineSec: number;
  serverTimeSec: number;
}

export interface LeaderboardRecord {
  ownerId: string;
  username: string;
  score: number;
  subscore: number;
  metadata: {
    username?: string;
    wins?: number;
    losses?: number;
    streak?: number;
    lastResult?: string;
  };
}
