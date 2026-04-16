"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type { GameState, LeaderboardRecord } from "@/types/game";
import { createNakamaClient, nakamaConfig } from "@/lib/nakama";
import { OPCODE_ERROR, OPCODE_MOVE, OPCODE_STATE, OPCODE_STATE_REQUEST } from "@/lib/opcodes";
import { clearActiveMatch, getActiveMatch, getUserId, saveActiveMatch } from "@/lib/storage";

type ConnectionStatus = "idle" | "connecting" | "connected" | "matchmaking" | "matched" | "error";

interface GameContextValue {
  username: string;
  userId: string;
  matchId: string;
  connectionStatus: ConnectionStatus;
  gameState: GameState | null;
  error: string;
  authenticate: (username: string) => Promise<void>;
  findMatch: () => Promise<void>;
  sendMove: (cell: number) => Promise<void>;
  requestState: () => Promise<void>;
  leaveLocalMatch: () => void;
  loadLeaderboard: () => Promise<LeaderboardRecord[]>;
}

const GameContext = createContext<GameContextValue | null>(null);

function decodePayload(data: unknown): string {
  if (typeof data === "string") {
    return data;
  }

  if (data instanceof Uint8Array) {
    return new TextDecoder().decode(data);
  }

  if (Array.isArray(data)) {
    return new TextDecoder().decode(new Uint8Array(data));
  }

  return "";
}

function getMatchId(matched: Record<string, unknown>) {
  return String(matched.match_id ?? matched.matchId ?? "");
}

export function GameProvider({ children }: { children: ReactNode }) {
  const clientRef = useRef<any>(null);
  const socketRef = useRef<any>(null);
  const sessionRef = useRef<any>(null);
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState("");
  const [matchId, setMatchId] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState("");

  const authenticate = useCallback(async (nextUsername: string) => {
    setConnectionStatus("connecting");
    setError("");

    const client = createNakamaClient();
    const nextUserId = getUserId();
    const session = await client.authenticateCustom(nextUserId, true, nextUsername);
    const socket = client.createSocket(nakamaConfig.useSSL, false);

    socket.onmatchdata = (message: any) => {
      const opCode = Number(message.op_code ?? message.opCode);
      const payload = decodePayload(message.data);

      if (opCode === OPCODE_STATE) {
        setGameState(JSON.parse(payload));
      }

      if (opCode === OPCODE_ERROR) {
        const parsed = JSON.parse(payload);
        setError(parsed.message ?? "The server rejected that action.");
      }
    };

    socket.ondisconnect = () => {
      setConnectionStatus("idle");
      setError("Disconnected from Nakama. Reconnect from matchmaking to continue.");
    };

    await socket.connect(session, true);

    const activeMatchId = getActiveMatch();
    if (activeMatchId) {
      try {
        await socket.joinMatch(activeMatchId);
        setMatchId(activeMatchId);
        await socket.sendMatchState(activeMatchId, OPCODE_STATE_REQUEST, "{}");
      } catch {
        clearActiveMatch();
      }
    }

    clientRef.current = client;
    socketRef.current = socket;
    sessionRef.current = session;
    setUsername(nextUsername);
    setUserId(nextUserId);
    setConnectionStatus("connected");
  }, []);

  const findMatch = useCallback(async () => {
    const socket = socketRef.current;
    if (!socket) {
      throw new Error("Connect before matchmaking.");
    }

    setError("");
    setConnectionStatus("matchmaking");

    socket.onmatchmakermatched = async (matched: Record<string, unknown>) => {
      const nextMatchId = getMatchId(matched);
      if (!nextMatchId) {
        setError("Nakama matched you, but did not return a match id.");
        setConnectionStatus("error");
        return;
      }

      await socket.joinMatch(nextMatchId);
      saveActiveMatch(nextMatchId);
      setMatchId(nextMatchId);
      setConnectionStatus("matched");
      await socket.sendMatchState(nextMatchId, OPCODE_STATE_REQUEST, "{}");
    };

    await socket.addMatchmaker("*", 2, 2, { game: "tic_tac_toe" }, {});
  }, []);

  const requestState = useCallback(async () => {
    const socket = socketRef.current;
    if (socket && matchId) {
      await socket.sendMatchState(matchId, OPCODE_STATE_REQUEST, "{}");
    }
  }, [matchId]);

  const sendMove = useCallback(
    async (cell: number) => {
      const socket = socketRef.current;
      if (!socket || !matchId) {
        setError("Join a match before sending moves.");
        return;
      }

      setError("");
      await socket.sendMatchState(matchId, OPCODE_MOVE, JSON.stringify({ cell }));
    },
    [matchId],
  );

  const leaveLocalMatch = useCallback(() => {
    clearActiveMatch();
    setMatchId("");
    setGameState(null);
    setConnectionStatus(socketRef.current ? "connected" : "idle");
  }, []);

  const loadLeaderboard = useCallback(async () => {
    const client = clientRef.current;
    const session = sessionRef.current;
    if (!client || !session) {
      return [];
    }

    const response = await client.rpc(session, "leaderboard", "{}");
    const payload = typeof response.payload === "string" ? response.payload : JSON.stringify(response.payload);
    return JSON.parse(payload).records ?? [];
  }, []);

  const value = useMemo<GameContextValue>(
    () => ({
      username,
      userId,
      matchId,
      connectionStatus,
      gameState,
      error,
      authenticate,
      findMatch,
      sendMove,
      requestState,
      leaveLocalMatch,
      loadLeaderboard,
    }),
    [authenticate, connectionStatus, error, findMatch, gameState, leaveLocalMatch, loadLeaderboard, matchId, requestState, sendMove, userId, username],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used inside GameProvider.");
  }

  return context;
}
