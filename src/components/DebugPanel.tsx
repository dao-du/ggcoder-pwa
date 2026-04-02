import { useRef, useEffect } from "react";
import type { DebugEvent, ConnectionStatus } from "../hooks/useWebSocket";

interface Props {
  events: DebugEvent[];
  connectionStatus: ConnectionStatus;
  onClose: () => void;
}

export default function DebugPanel({
  events,
  connectionStatus,
  onClose,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div className="border-b border-[var(--border)] bg-black/90">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono font-bold text-yellow-400">
            🐛 Debug
          </span>
          <span
            className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${
              connectionStatus === "connected"
                ? "bg-green-900 text-green-300"
                : connectionStatus === "connecting"
                  ? "bg-yellow-900 text-yellow-300"
                  : "bg-red-900 text-red-300"
            }`}
          >
            WS: {connectionStatus}
          </span>
          <span className="font-mono text-[10px] text-[var(--text-secondary)]">
            {events.length} events
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-[var(--text-secondary)]"
        >
          ✕
        </button>
      </div>
      <div
        ref={scrollRef}
        className="max-h-48 overflow-y-auto px-3 pb-2 font-mono text-[11px]"
      >
        {events.length === 0 ? (
          <div className="text-[var(--text-secondary)]">
            No events yet...
          </div>
        ) : (
          events.map((evt, i) => (
            <div key={i} className="leading-5">
              <span className="text-[var(--text-secondary)]">{evt.time}</span>{" "}
              <span
                className={
                  evt.direction === "in" ? "text-green-400" : "text-blue-400"
                }
              >
                {evt.direction === "in" ? "←" : "→"}
              </span>{" "}
              <span className="break-all text-[var(--text-primary)]">
                {evt.data}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
