import Link from "next/link";
import type { ReactNode } from "react";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-6xl flex-col">
        <header className="flex items-center justify-between gap-4 py-3">
          <Link href="/" className="text-lg font-black tracking-normal text-ink">
            Tic-Tac-Toe Arena
          </Link>
          <span className="rounded-md border border-grid bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Nakama
          </span>
        </header>
        <div className="flex flex-1 items-center justify-center py-6">{children}</div>
      </div>
    </main>
  );
}
