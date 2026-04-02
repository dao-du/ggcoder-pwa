import { useState } from "react";
import type { ConnectionStatus } from "../hooks/useWebSocket";
import GGLogo from "./GGLogo";
import SettingsMenu from "./SettingsMenu";

interface Props {
  connectionStatus: ConnectionStatus;
  sessionId?: string;
  onBack?: () => void;
  onToggleDebug: () => void;
  showDebug: boolean;
  onNavigateSessions?: () => void;
  planMode: boolean;
  thinkingMode: boolean;
  onSendCommand: (command: string) => void;
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
  onNavigateSessions,
  planMode,
  thinkingMode,
  onSendCommand,
}: Props) {
  const { color, label } = STATUS_CONFIG[connectionStatus];
  const [showMenu, setShowMenu] = useState(false);

  return (
    <header className="safe-top relative flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3">
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
        <button
          onClick={() => setShowMenu((p) => !p)}
          className="appearance-none border-0 bg-transparent p-0 cursor-pointer"
          aria-label="Open menu"
        >
          <GGLogo variant="header" />
        </button>
      </div>
      {showMenu && (
        <SettingsMenu
          onClose={() => setShowMenu(false)}
          onNavigateSessions={onBack ? undefined : onNavigateSessions}
          planMode={planMode}
          thinkingMode={thinkingMode}
          onSendCommand={onSendCommand}
          onToggleDebug={onToggleDebug}
          showDebug={showDebug}
        />
      )}
      <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
        <span className={`h-2 w-2 rounded-full ${color}`} />
        <span>{label}</span>
      </div>
    </header>
  );
}
