import { Clock, ShieldCheck, Trophy } from "lucide-react";
import type { GameState, Mark } from "@/types/game";

interface StatusPanelProps {
  gameState: GameState;
  localMark?: Mark;
  secondsLeft: number;
}

export function StatusPanel({ gameState, localMark, secondsLeft }: StatusPanelProps) {
  const winnerText = gameState.winner ? `Player ${gameState.winner} wins` : "Draw";
  const headline =
    gameState.status === "waiting"
      ? "Waiting for opponent"
      : gameState.status === "playing"
        ? gameState.turn === localMark
          ? "Your move"
          : `Player ${gameState.turn}'s move`
        : gameState.status === "forfeit"
          ? `${winnerText} by forfeit`
          : winnerText;

  return (
    <section className="w-full rounded-lg border border-grid bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Match status</p>
          <h1 className="mt-1 text-2xl font-black text-ink">{headline}</h1>
        </div>
        <div className="flex items-center gap-2 rounded-md bg-mist px-3 py-2 text-sm font-semibold text-ink">
          {gameState.status === "playing" ? <Clock className="h-4 w-4" /> : <Trophy className="h-4 w-4" />}
          {gameState.status === "playing" ? `${secondsLeft}s` : gameState.status}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
        <ShieldCheck className="h-4 w-4 text-teal" aria-hidden="true" />
        Server-authoritative state synced from Nakama.
      </div>
    </section>
  );
}
