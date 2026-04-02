import { useEffect, useState, useCallback, useRef } from "react";
import type { Session, ClientMessage } from "../types";
import type { ConnectionStatus } from "../hooks/useWebSocket";
import GGLogo from "./GGLogo";

interface Props {
  lastMessage: unknown;
  send: (msg: ClientMessage) => void;
  connectionStatus: ConnectionStatus;
  onSelect: (sessionId: string, cwd?: string) => void;
}

export default function SessionList({
  lastMessage,
  send,
  connectionStatus,
  onSelect,
}: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    send({ action: "list_sessions" });
  }, [send]);

  // Request sessions when WS becomes connected
  useEffect(() => {
    if (connectionStatus === "connected") {
      refresh();
    }
  }, [connectionStatus, refresh]);

  // Handle incoming session list
  useEffect(() => {
    if (
      lastMessage &&
      typeof lastMessage === "object" &&
      "event" in lastMessage
    ) {
      const msg = lastMessage as { event: string; sessions?: Session[] };
      if (msg.event === "sessions" && msg.sessions) {
        setSessions(msg.sessions);
        setLoading(false);
      }
    }
  }, [lastMessage]);

  // Pull-to-refresh
  const [pullY, setPullY] = useState(0);
  const [pulling, setPulling] = useState(false);
  const startYRef = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 0 && window.scrollY === 0) {
      setPullY(Math.min(delta * 0.5, 80));
      setPulling(true);
    }
  };

  const handleTouchEnd = () => {
    if (pullY > 60) {
      refresh();
    }
    setPullY(0);
    setPulling(false);
  };

  const statusDot = (status: string) => {
    if (status === "working")
      return <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />;
    if (status === "idle")
      return <span className="h-2.5 w-2.5 rounded-full bg-green-400" />;
    return <span className="h-2.5 w-2.5 rounded-full bg-gray-500" />;
  };

  return (
    <div
      className="flex-1 overflow-y-auto p-4"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {pulling && (
        <div
          className="flex items-center justify-center text-[var(--text-secondary)] transition-all"
          style={{ height: pullY }}
        >
          {pullY > 60 ? "Release to refresh" : "Pull to refresh"}
        </div>
      )}

      {connectionStatus !== "connected" ? (
        <div className="flex h-full items-center justify-center text-[var(--text-secondary)]">
          <div className="text-center">
            <div className="mb-6">
              <GGLogo variant="splash" />
            </div>
            <div className="text-sm">Connecting to bridge server...</div>
          </div>
        </div>
      ) : loading ? (
        <div className="flex h-full items-center justify-center text-[var(--text-secondary)]">
          <div className="text-center">
            <div className="mb-6">
              <GGLogo variant="splash" />
            </div>
            <div className="text-sm">Scanning for sessions...</div>
          </div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex h-full items-center justify-center text-[var(--text-secondary)]">
          <div className="text-center">
            <div className="mb-6">
              <GGLogo variant="splash" />
            </div>
            <div className="mb-1 text-sm">
              No active sessions found
            </div>
            <div className="text-xs opacity-70">
              Start GGCoder with --rc flag, then tap Refresh
            </div>
            <button
              onClick={refresh}
              className="mt-4 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
            >
              Refresh
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Active Sessions</h2>
            <button
              onClick={refresh}
              className="rounded-lg bg-[var(--bg-secondary)] px-3 py-1.5 text-xs text-[var(--text-secondary)] active:bg-[var(--border)]"
            >
              ↻ Refresh
            </button>
          </div>
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelect(s.id, s.cwd)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 text-left transition-colors active:bg-[var(--border)]"
            >
              <div className="flex items-center gap-2">
                {statusDot(s.status)}
                <span className="font-mono text-sm font-medium">
                  PID {s.pid}
                </span>
                <span className="ml-auto text-xs capitalize text-[var(--text-secondary)]">
                  {s.status}
                </span>
              </div>
              <div className="mt-2 truncate font-mono text-sm text-[var(--text-secondary)]">
                {s.cwd}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
