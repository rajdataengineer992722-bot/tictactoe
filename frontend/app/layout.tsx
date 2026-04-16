import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { GameProvider } from "@/lib/game-provider";

export const metadata: Metadata = {
  title: "Tic-Tac-Toe Arena",
  description: "Server-authoritative multiplayer Tic-Tac-Toe powered by Nakama.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <GameProvider>{children}</GameProvider>
      </body>
    </html>
  );
}
