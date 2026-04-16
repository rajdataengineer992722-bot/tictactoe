"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/Button";
import { GameBoard } from "@/components/GameBoard";
import { PlayerCard } from "@/components/PlayerCard";
import { Shell } from "@/components/Shell";
import { StatusPanel } from "@/components/StatusPanel";
import { useGame } from "@/lib/game-provider";
import type { Mark } from "@/types/game";

export default function GamePage() {
  const router = useRouter();
  const { gameState, userId, matchId, sendMove, requestState, leaveLocalMatch, error } = useGame();
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    if (!matchId) {
      router.replace("/matchmaking");
    }
  }, [matchId, router]);

  useEffect(() => {
    requestState().catch(() => undefined);
  }, [requestState]);

  useEffect(() => {
    const id = window.setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 500);
    return () => window.clearInterval(id);
  }, []);

  const localPlayer = useMemo(() => gameState?.players.find((player) => player.userId === userId), [gameState, userId]);
  const playerX = gameState?.players.find((player) => player.mark === "X");
  const playerO = gameState?.players.find((player) => player.mark === "O");
  const secondsLeft = gameState?.moveDeadlineSec ? Math.max(0, gameState.moveDeadlineSec - nowSec) : 0;
  const localMark = localPlayer?.mark as Mark | undefined;
  const canMove = Boolean(gameState?.status === "playing" && localMark === gameState.turn);

  function playAgain() {
    leaveLocalMatch();
    router.push("/matchmaking");
  }

  if (!gameState) {
    return (
      <Shell>
        <section className="w-full max-w-xl rounded-lg border border-grid bg-white p-6 text-center shadow-soft">
          <h1 className="text-2xl font-black text-ink">Joining match...</h1>
          <p className="mt-2 text-sm text-slate-600">Waiting for the first authoritative state snapshot.</p>
        </section>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="grid w-full items-start gap-5 lg:grid-cols-[18rem_1fr_18rem]">
        <div className="space-y-4 lg:order-1">
          <PlayerCard player={playerX} mark="X" active={gameState.turn === "X" && gameState.status === "playing"} local={localMark === "X"} />
          <PlayerCard player={playerO} mark="O" active={gameState.turn === "O" && gameState.status === "playing"} local={localMark === "O"} />
        </div>

        <section className="flex flex-col items-center gap-5 lg:order-2">
          <StatusPanel gameState={gameState} localMark={localMark} secondsLeft={secondsLeft} />
          {error ? <p className="w-full rounded-md bg-coral/10 px-3 py-2 text-sm font-medium text-coral">{error}</p> : null}
          <GameBoard board={gameState.board} winningLine={gameState.winningLine} disabled={!canMove} onMove={sendMove} />
        </section>

        <aside className="rounded-lg border border-grid bg-white p-4 shadow-sm lg:order-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Room</p>
          <p className="mt-1 break-all text-sm font-semibold text-ink">{matchId}</p>
          <div className="mt-5 rounded-md bg-mist p-3 text-sm text-slate-600">
            You are Player {localMark ?? "?"}. Moves are submitted to Nakama and only rendered after the server broadcasts the updated state.
          </div>
          <Button className="mt-5 w-full" variant="secondary" onClick={playAgain}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            New Match
          </Button>
        </aside>
      </div>
    </Shell>
  );
}
