import { useEffect } from "react";

interface ToastsProps {
  toasts: { index: number; text: string }[];
  paused: boolean; // hot-seat: wait until the pass screen is gone so the right player sees them
  onDismiss: () => void;
}

// things aimed at you since you last looked, cleared after a few seconds or with the ✕
export default function Toasts({ toasts, paused, onDismiss }: ToastsProps) {
  useEffect(() => {
    if (paused || toasts.length === 0) return;
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [paused, toasts.length, onDismiss]);

  if (paused || toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-30 flex w-[min(28rem,90vw)] -translate-x-1/2 flex-col gap-2">
      {toasts.slice(-3).map(({ index, text }) => (
        <div
          key={index}
          data-cy="toast"
          role="status"
          className="pointer-events-auto flex items-start justify-between gap-3 rounded-lg bg-neutral-900/90 px-4 py-2 text-sm text-white shadow-lg"
        >
          <span>{text}</span>
          <button type="button" aria-label="Dismiss" onClick={onDismiss} className="cursor-pointer text-white/70">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
