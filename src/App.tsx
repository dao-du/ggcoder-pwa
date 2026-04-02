import { useState, useCallback } from "react";
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
}

export default function App() {
  const [view, setView] = useState<View>({ screen: "sessions" });
  const [showDebug, setShowDebug] = useState(false);
  const [sessionMeta, setSessionMeta] = useState<SessionMeta>({ planMode: false });
  const { status, lastMessage, send, debugEvents } = useWebSocket();

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

  const handleSessionMeta = useCallback((meta: SessionMeta) => {
    setSessionMeta(meta);
  }, []);

  return (
    <div className="flex h-full flex-col" style={{ paddingBottom: 24 }}>
      <StatusBar
        connectionStatus={status}
        sessionId={view.screen === "chat" ? view.sessionId : undefined}
        onBack={view.screen === "chat" ? handleBack : undefined}
        onToggleDebug={() => setShowDebug((p) => !p)}
        showDebug={showDebug}
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
            lastMessage={lastMessage}
            send={send}
            connectionStatus={status}
            onSelect={handleSelectSession}
          />
        ) : (
          <ChatView
            sessionId={view.sessionId}
            lastMessage={lastMessage}
            send={send}
            onSessionMeta={handleSessionMeta}
          />
        )}
      </div>
      {view.screen === "chat" && (
        <FooterBar
          cwd={sessionMeta.cwd}
          model={sessionMeta.model}
          planMode={sessionMeta.planMode}
          thinkingMode={true}
        />
      )}
    </div>
  );
}
