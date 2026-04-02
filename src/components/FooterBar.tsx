import { useState, useRef, useEffect } from "react";

interface Props {
  cwd?: string;
  model?: string;
  planMode: boolean;
  thinkingMode: boolean;
  onSendCommand?: (command: string) => void;
}

function shortenModel(model: string): string {
  const lower = model.toLowerCase();
  if (lower.includes("opus")) return "Opus";
  if (lower.includes("sonnet")) return "Sonnet";
  if (lower.includes("haiku")) return "Haiku";
  return model.split("-").slice(0, 2).join("-");
}

const QUICK_ACTIONS = [
  { label: "Compact", command: "/compact", icon: "📦" },
  { label: "Model", command: "/model", icon: "🤖" },
  { label: "Clear", command: "/clear", icon: "🧹" },
];

export default function FooterBar({ cwd, model, planMode, thinkingMode, onSendCommand }: Props) {
  const dirName = cwd ? cwd.split("/").filter(Boolean).pop() ?? "—" : "—";
  const modelLabel = model ? shortenModel(model) : "—";
  const [showActions, setShowActions] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const dim = "#6e7681";
  const amber = "#fbbf24";
  const green = "#34d399";

  // Close popover on outside tap
  useEffect(() => {
    if (!showActions) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowActions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showActions]);

  const pillBase: React.CSSProperties = {
    padding: "2px 8px",
    borderRadius: 9999,
    fontSize: 11,
    fontWeight: 500,
    border: "1px solid transparent",
    cursor: onSendCommand ? "pointer" : "default",
    transition: "all 0.15s ease",
    WebkitTapHighlightColor: "transparent",
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 32,
        backgroundColor: "#0d1117",
        borderTop: "1px solid #30363d",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 10px",
        fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
        fontSize: 11,
        color: dim,
        zIndex: 50,
        userSelect: "none",
      }}
    >
      {/* Left: directory basename */}
      <span style={{ flexShrink: 0 }}>{dirName}</span>

      {/* Center: model name */}
      <span style={{ flexShrink: 0 }}>{modelLabel}</span>

      {/* Right: toggle pills + quick actions */}
      <span style={{ display: "flex", alignItems: "center", gap: 6, position: "relative" }}>
        {/* Plan toggle pill */}
        <span
          role="button"
          tabIndex={0}
          onClick={() => onSendCommand?.("/plan")}
          style={{
            ...pillBase,
            color: planMode ? "#000" : dim,
            backgroundColor: planMode ? amber : "transparent",
            borderColor: planMode ? amber : "#30363d",
          }}
        >
          Plan
        </span>

        {/* Thinking toggle pill */}
        <span
          role="button"
          tabIndex={0}
          onClick={() => onSendCommand?.("/think")}
          style={{
            ...pillBase,
            color: thinkingMode ? "#000" : dim,
            backgroundColor: thinkingMode ? green : "transparent",
            borderColor: thinkingMode ? green : "#30363d",
          }}
        >
          Think
        </span>

        {/* Quick actions button */}
        <span
          role="button"
          tabIndex={0}
          onClick={() => setShowActions((p) => !p)}
          style={{
            ...pillBase,
            borderColor: showActions ? "#58a6ff" : "#30363d",
            color: showActions ? "#58a6ff" : dim,
            fontSize: 13,
            padding: "1px 6px",
          }}
        >
          ⚡
        </span>

        {/* Quick actions popover */}
        {showActions && (
          <div
            ref={popoverRef}
            style={{
              position: "absolute",
              bottom: 32,
              right: 0,
              backgroundColor: "#161b22",
              border: "1px solid #30363d",
              borderRadius: 8,
              padding: 4,
              minWidth: 140,
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              zIndex: 100,
            }}
          >
            {QUICK_ACTIONS.map((a) => (
              <div
                key={a.command}
                role="button"
                tabIndex={0}
                onClick={() => {
                  onSendCommand?.(a.command);
                  setShowActions(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 6,
                  fontSize: 13,
                  color: "#c9d1d9",
                  cursor: "pointer",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#21262d")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <span>{a.icon}</span>
                <span>{a.label}</span>
                <span style={{ marginLeft: "auto", fontSize: 11, color: dim }}>{a.command}</span>
              </div>
            ))}
          </div>
        )}
      </span>
    </div>
  );
}
