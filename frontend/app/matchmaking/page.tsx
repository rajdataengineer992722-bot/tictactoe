"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Wifi } from "lucide-react";
import { Button } from "@/components/Button";
import { Leaderboard } from "@/components/Leaderboard";
import { Shell } from "@/components/Shell";
import { useGame } from "@/lib/game-provider";

export default function MatchmakingPage() {
  const router = useRouter();
  const { username, connectionStatus, error, findMatch, matchId } = useGame();
  const [isFinding, setIsFinding] = useState(false);

  useEffect(() => {
    if (!username) {
      router.replace("/");
    }
  }, [router, username]);

  useEffect(() => {
    if (matchId) {
      router.push("/game");
    }
  }, [matchId, router]);

  async function onFindMatch() {
    setIsFinding(true);
    try {
      await findMatch();
    } finally {
      setIsFinding(false);
    }
  }

  return (
    <Shell>
      <div className="grid w-full gap-5 lg:grid-cols-[1fr_22rem]">
        <section className="rounded-lg border border-grid bg-white p-6 shadow-soft sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-md bg-coral/10 text-coral">
              <Search className="h-7 w-7" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-3xl font-black text-ink">Matchmaking</h1>
              <p className="mt-1 text-sm text-slate-600">Signed in as {username}.</p>
            </div>
          </div>

          <div className="mt-8 rounded-lg border border-grid bg-mist p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Wifi className="h-4 w-4 text-teal" aria-hidden="true" />
              Status: {connectionStatus}
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Find Match places you in Nakama matchmaking. When another player enters the queue, the backend creates an isolated authoritative room.
            </p>
          </div>

          {error ? <p className="mt-4 rounded-md bg-coral/10 px-3 py-2 text-sm font-medium text-coral">{error}</p> : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button loading={isFinding || connectionStatus === "matchmaking"} onClick={onFindMatch}>
              Find Match
            </Button>
            <Button variant="secondary" onClick={() => router.push("/")}>
              Change Username
            </Button>
          </div>
        </section>
        <Leaderboard />
      </div>
    </Shell>
  );
}
