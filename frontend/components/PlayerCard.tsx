import { Circle, X } from "lucide-react";
import { clsx } from "clsx";
import type { Mark, PlayerState } from "@/types/game";

interface PlayerCardProps {
  player?: PlayerState;
  mark: Mark;
  active: boolean;
  local: boolean;
}

export function PlayerCard({ player, mark, active, local }: PlayerCardProps) {
  const Icon = mark === "X" ? X : Circle;

  return (
    <div
      className={clsx(
        "rounded-lg border bg-white p-4 shadow-sm transition",
        active ? "border-ink" : "border-grid",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={clsx(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
              mark === "X" ? "bg-coral/10 text-coral" : "bg-teal/10 text-teal",
            )}
          >
            <Icon className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-bold text-ink">{player?.username ?? "Waiting..."}</p>
            <p className="text-xs text-slate-500">Player {mark}{local ? " - you" : ""}</p>
          </div>
        </div>
        <span className={clsx("h-2.5 w-2.5 rounded-full", player?.connected ? "bg-teal" : "bg-slate-300")} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-slate-500">
        <div className="rounded-md bg-mist p-2">
          <strong className="block text-sm text-ink">{player?.wins ?? 0}</strong>
          Wins
        </div>
        <div className="rounded-md bg-mist p-2">
          <strong className="block text-sm text-ink">{player?.losses ?? 0}</strong>
          Losses
        </div>
        <div className="rounded-md bg-mist p-2">
          <strong className="block text-sm text-ink">{player?.streak ?? 0}</strong>
          Streak
        </div>
      </div>
    </div>
  );
}
