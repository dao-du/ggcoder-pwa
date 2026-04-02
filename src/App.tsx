import { useState, useCallback, useRef, useEffect } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import SessionList from "./components/SessionList";
import ChatView from "./components/ChatView";
import StatusBar from "./components/StatusBar";
import DebugPanel from "./components/DebugPanel";
import FooterBar from "./components/FooterBar";

type View = { screen: "sessions" } | { screen: "chat"; sessionId: string };

interface SessionMeta {
  cwd?: string;
  model?: string;
  planMode: boolean;
  thinkingMode: boolean;
}

export default function App() {
  // Restore saved text size on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("gg-chat-font-size");
      if (saved) document.documentElement.style.setProperty("--chat-font-size", saved);
    } catch {}
  }, []);

  const [view, setView] = useState<View>({ screen: "sessions" });
  const [showDebug, setShowDebug] = useState(false);
  const [sessionMeta, setSessionMeta] = useState<SessionMeta>({ planMode: false, thinkingMode: true });
  const { status, queueTick, drainMessages, send, debugEvents } = useWebSocket();

  const handleSelectSession = useCallback(
    (sessionId: string, cwd?: string) => {
      send({ action: "connect", sessionId });
      setView({ screen: "chat", sessionId });
      setSessionMeta((prev) => ({ ...prev, cwd }));
    },
    [send]
  );

  const handleBack = useCallback(() => {
    setView({ screen: "sessions" });
  }, []);

  const handleSessionMeta = useCallback((metaOrUpdater: SessionMeta | ((prev: SessionMeta) => SessionMeta)) => {
    if (typeof metaOrUpdater === "function") {
      setSessionMeta(metaOrUpdater);
    } else {
      setSessionMeta(metaOrUpdater);
    }
  }, []);

  // Ref to inject commands into ChatView from FooterBar
  const pendingCommandRef = useRef<string | null>(null);
  const [commandTick, setCommandTick] = useState(0);

  const handleSendCommand = useCallback((command: string) => {
    // Optimistically toggle local state for mode commands
    if (command === "/think") {
      setSessionMeta((prev) => ({ ...prev, thinkingMode: !prev.thinkingMode }));
    } else if (command === "/plan") {
      setSessionMeta((prev) => ({ ...prev, planMode: !prev.planMode }));
    }
    pendingCommandRef.current = command;
    setCommandTick((t) => t + 1);
  }, []);

  return (
    <div className="flex h-full flex-col" style={{ paddingBottom: 32 }}>
      <StatusBar
        connectionStatus={status}
        sessionId={view.screen === "chat" ? view.sessionId : undefined}
        onBack={view.screen === "chat" ? handleBack : undefined}
        onToggleDebug={() => setShowDebug((p) => !p)}
        showDebug={showDebug}
        onNavigateSessions={view.screen === "chat" ? handleBack : undefined}
        planMode={sessionMeta.planMode}
        thinkingMode={sessionMeta.thinkingMode}
        onSendCommand={handleSendCommand}
      />
      {showDebug && (
        <DebugPanel
          events={debugEvents}
          connectionStatus={status}
          onClose={() => setShowDebug(false)}
        />
      )}
      <div className="flex min-h-0 flex-1 flex-col">
        {view.screen === "sessions" ? (
          <SessionList
            queueTick={queueTick}
            drainMessages={drainMessages}
            send={send}
            connectionStatus={status}
            onSelect={handleSelectSession}
          />
        ) : (
          <ChatView
            sessionId={view.sessionId}
            queueTick={queueTick}
            drainMessages={drainMessages}
            send={send}
            onSessionMeta={handleSessionMeta}
            externalCommand={pendingCommandRef.current}
            commandTick={commandTick}
          />
        )}
      </div>
      {view.screen === "chat" && (
        <FooterBar
          cwd={sessionMeta.cwd}
          model={sessionMeta.model}
          planMode={sessionMeta.planMode}
          thinkingMode={sessionMeta.thinkingMode}
          onSendCommand={handleSendCommand}
        />
      )}
    </div>
  );
}
