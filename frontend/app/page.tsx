"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Gamepad2 } from "lucide-react";
import { Button } from "@/components/Button";
import { Shell } from "@/components/Shell";
import { useGame } from "@/lib/game-provider";
import { getUsername, saveUsername } from "@/lib/storage";

export default function HomePage() {
  const router = useRouter();
  const { authenticate, connectionStatus, error } = useGame();
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setUsername(getUsername());
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      return;
    }

    setIsSubmitting(true);
    try {
      saveUsername(cleanUsername);
      await authenticate(cleanUsername);
      router.push("/matchmaking");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Shell>
      <section className="w-full max-w-xl rounded-lg border border-grid bg-white p-6 shadow-soft sm:p-8">
        <div className="mb-7 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-md bg-teal/10 text-teal">
            <Gamepad2 className="h-7 w-7" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-3xl font-black text-ink">Enter the arena</h1>
            <p className="mt-1 text-sm text-slate-600">Play real-time Tic-Tac-Toe with authoritative Nakama matches.</p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-ink">Username</span>
            <input
              className="mt-2 h-12 w-full rounded-md border border-grid bg-mist px-4 text-ink outline-none transition focus:border-ink focus:bg-white"
              maxLength={24}
              minLength={2}
              placeholder="ada"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
          {error ? <p className="rounded-md bg-coral/10 px-3 py-2 text-sm font-medium text-coral">{error}</p> : null}
          <Button className="w-full" loading={isSubmitting || connectionStatus === "connecting"}>
            Continue
          </Button>
        </form>
      </section>
    </Shell>
  );
}
