import { useState, useRef, useEffect } from "react";

const TEXT_SIZES = [
  { label: "S", value: "14px" },
  { label: "M", value: "16px" },
  { label: "L", value: "18px" },
  { label: "XL", value: "20px" },
];

interface Props {
  onClose: () => void;
  onNavigateSessions?: () => void;
  planMode: boolean;
  thinkingMode: boolean;
  onSendCommand: (command: string) => void;
  onToggleDebug: () => void;
  showDebug: boolean;
}

export default function SettingsMenu({
  onClose,
  onNavigateSessions,
  planMode,
  thinkingMode,
  onSendCommand,
  onToggleDebug,
  showDebug,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [currentSize, setCurrentSize] = useState(() => {
    return getComputedStyle(document.documentElement).getPropertyValue("--chat-font-size").trim() || "16px";
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const setTextSize = (size: string) => {
    document.documentElement.style.setProperty("--chat-font-size", size);
    setCurrentSize(size);
    try { localStorage.setItem("gg-chat-font-size", size); } catch {}
  };

  // Restore saved size on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("gg-chat-font-size");
      if (saved) {
        document.documentElement.style.setProperty("--chat-font-size", saved);
        setCurrentSize(saved);
      }
    } catch {}
  }, []);

  const dim = "#6e7681";
  const amber = "#fbbf24";
  const green = "#34d399";

  const sectionLabel: React.CSSProperties = {
    fontSize: 11,
    color: "#8b949e",
    marginBottom: 8,
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  };

  const pillBase: React.CSSProperties = {
    padding: "4px 14px",
    borderRadius: 9999,
    fontSize: 13,
    fontWeight: 500,
    border: "1px solid transparent",
    cursor: "pointer",
    transition: "all 0.15s ease",
    WebkitTapHighlightColor: "transparent",
  };

  const divider = <div style={{ height: 1, backgroundColor: "#30363d", margin: "4px 8px" }} />;

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top: "100%",
        left: 12,
        marginTop: 4,
        backgroundColor: "#161b22",
        border: "1px solid #30363d",
        borderRadius: 10,
        padding: 6,
        minWidth: 220,
        boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
        zIndex: 200,
      }}
    >
      {/* Sessions link */}
      {onNavigateSessions && (
        <>
          <div
            role="button"
            tabIndex={0}
            onClick={() => { onNavigateSessions(); onClose(); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 8,
              fontSize: 14,
              color: "#c9d1d9",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#21262d")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <span>📡</span>
            <span>Active Sessions</span>
          </div>
          {divider}
        </>
      )}

      {/* Text size */}
      <div style={{ padding: "8px 12px" }}>
        <div style={sectionLabel}>Text Size</div>
        <div style={{ display: "flex", gap: 6 }}>
          {TEXT_SIZES.map((s) => (
            <button
              key={s.value}
              onClick={() => setTextSize(s.value)}
              style={{
                flex: 1,
                padding: "6px 0",
                borderRadius: 6,
                border: currentSize === s.value ? "1px solid #58a6ff" : "1px solid #30363d",
                backgroundColor: currentSize === s.value ? "#58a6ff20" : "transparent",
                color: currentSize === s.value ? "#58a6ff" : "#8b949e",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.1s",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {divider}

      {/* Mode toggles */}
      <div style={{ padding: "8px 12px" }}>
        <div style={sectionLabel}>Modes</div>
        <div style={{ display: "flex", gap: 8 }}>
          <span
            role="button"
            tabIndex={0}
            onClick={() => { onSendCommand("/plan"); onClose(); }}
            style={{
              ...pillBase,
              color: planMode ? "#000" : dim,
              backgroundColor: planMode ? amber : "transparent",
              borderColor: planMode ? amber : "#30363d",
            }}
          >
            Plan
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={() => { onSendCommand("/think"); onClose(); }}
            style={{
              ...pillBase,
              color: thinkingMode ? "#000" : dim,
              backgroundColor: thinkingMode ? green : "transparent",
              borderColor: thinkingMode ? green : "#30363d",
            }}
          >
            Thinking
          </span>
        </div>
      </div>

      {divider}

      {/* Skills */}
      <div style={{ padding: "8px 12px" }}>
        <div style={sectionLabel}>Skills</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#c9d1d9" }}>
          <span style={{ fontSize: 14 }}>🔌</span>
          <div>
            <div style={{ fontWeight: 500 }}>remote-control</div>
            <div style={{ fontSize: 11, color: "#8b949e", marginTop: 1 }}>Unix socket RC protocol</div>
          </div>
        </div>
      </div>

      {divider}

      {/* Debug toggle */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => { onToggleDebug(); onClose(); }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          borderRadius: 8,
          fontSize: 14,
          color: showDebug ? "#fbbf24" : "#c9d1d9",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#21262d")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
      >
        <span>🐛</span>
        <span>Debug</span>
        <span style={{
          marginLeft: "auto",
          fontSize: 11,
          color: showDebug ? "#fbbf24" : "#8b949e",
          fontWeight: 500,
        }}>
          {showDebug ? "ON" : "OFF"}
        </span>
      </div>
    </div>
  );
}
