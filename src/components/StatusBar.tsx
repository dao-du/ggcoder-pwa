import type { ConnectionStatus } from "../hooks/useWebSocket";
import GGLogo from "./GGLogo";

interface Props {
  connectionStatus: ConnectionStatus;
  sessionId?: string;
  onBack?: () => void;
  onToggleDebug: () => void;
  showDebug: boolean;
}

const STATUS_CONFIG: Record<
  ConnectionStatus,
  { color: string; label: string }
> = {
  connected: { color: "bg-green-400", label: "Connected" },
  connecting: { color: "bg-yellow-400 animate-pulse", label: "Connecting…" },
  disconnected: { color: "bg-red-400", label: "Disconnected" },
};

export default function StatusBar({
  connectionStatus,
  sessionId,
  onBack,
  onToggleDebug,
  showDebug,
}: Props) {
  const { color, label } = STATUS_CONFIG[connectionStatus];

  return (
    <header className="safe-top flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3">
      {onBack && (
        <button
          onClick={onBack}
          className="mr-1 text-[var(--accent)]"
          aria-label="Back"
        >
          ← Back
        </button>
      )}
      <div className="flex-1 truncate">
        {sessionId ? (
          <span className="font-mono text-sm font-medium text-[var(--text-primary)]">
            {sessionId}
          </span>
        ) : (
          <GGLogo variant="header" />
        )}
      </div>
      <button
        onClick={onToggleDebug}
        className={`rounded px-1.5 py-0.5 text-sm ${showDebug ? "bg-yellow-900 text-yellow-300" : "text-[var(--text-secondary)]"}`}
        aria-label="Toggle debug panel"
      >
        🐛
      </button>
      <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
        <span className={`h-2 w-2 rounded-full ${color}`} />
        <span>{label}</span>
      </div>
    </header>
  );
}
