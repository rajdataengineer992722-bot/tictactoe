import Image from "next/image";
import { clsx } from "clsx";
import type { Cell } from "@/types/game";

interface GameBoardProps {
  board: Cell[];
  winningLine: number[] | null;
  disabled: boolean;
  onMove: (cell: number) => void;
}

export function GameBoard({ board, winningLine, disabled, onMove }: GameBoardProps) {
  return (
    <div className="grid w-full max-w-[min(92vw,34rem)] grid-cols-3 gap-2 rounded-lg border border-grid bg-white p-2 shadow-soft sm:gap-3 sm:p-3">
      {board.map((cell, index) => {
        const isWinningCell = winningLine?.includes(index);
        return (
          <button
            key={index}
            aria-label={`Cell ${index + 1}`}
            className={clsx(
              "board-cell flex items-center justify-center rounded-md border border-grid bg-mist transition hover:border-ink focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2",
              isWinningCell && "border-teal bg-teal/10",
              disabled || cell ? "cursor-default" : "hover:bg-white",
            )}
            disabled={disabled || Boolean(cell)}
            onClick={() => onMove(index)}
          >
            {cell === "X" ? <Image src="/mark-x.svg" alt="X" width={82} height={82} priority /> : null}
            {cell === "O" ? <Image src="/mark-o.svg" alt="O" width={82} height={82} priority /> : null}
          </button>
        );
      })}
    </div>
  );
}
