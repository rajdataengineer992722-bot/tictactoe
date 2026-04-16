"use client";

import { useEffect, useState } from "react";
import { Medal } from "lucide-react";
import { useGame } from "@/lib/game-provider";
import type { LeaderboardRecord } from "@/types/game";

export function Leaderboard() {
  const { loadLeaderboard, connectionStatus } = useGame();
  const [records, setRecords] = useState<LeaderboardRecord[]>([]);

  useEffect(() => {
    if (connectionStatus === "idle") {
      return;
    }

    loadLeaderboard().then(setRecords).catch(() => setRecords([]));
  }, [connectionStatus, loadLeaderboard]);

  return (
    <aside className="rounded-lg border border-grid bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Medal className="h-5 w-5 text-coral" aria-hidden="true" />
        <h2 className="font-black text-ink">Leaderboard</h2>
      </div>
      {records.length === 0 ? (
        <p className="text-sm text-slate-500">No ranked games yet.</p>
      ) : (
        <ol className="space-y-2">
          {records.map((record, index) => (
            <li key={record.ownerId} className="flex items-center justify-between rounded-md bg-mist px-3 py-2 text-sm">
              <span className="font-semibold text-ink">
                {index + 1}. {record.metadata.username ?? record.username}
              </span>
              <span className="text-slate-600">{record.metadata.wins ?? 0} wins</span>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
