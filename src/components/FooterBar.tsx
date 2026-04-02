interface Props {
  cwd?: string;
  model?: string;
  planMode: boolean;
  thinkingMode: boolean;
}

function shortenModel(model: string): string {
  const lower = model.toLowerCase();
  if (lower.includes("opus")) return "Opus";
  if (lower.includes("sonnet")) return "Sonnet";
  if (lower.includes("haiku")) return "Haiku";
  return model.split("-").slice(0, 2).join("-");
}

export default function FooterBar({ cwd, model, planMode, thinkingMode }: Props) {
  const dirName = cwd ? cwd.split("/").filter(Boolean).pop() ?? "—" : "—";
  const modelLabel = model ? shortenModel(model) : "—";

  const dim = "#6e7681";
  const amber = "#fbbf24";
  const green = "#34d399";
  const separatorColor = "#484f58";

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 24,
        backgroundColor: "#0d1117",
        borderTop: "1px solid #30363d",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 12px",
        fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
        fontSize: 11,
        color: dim,
        zIndex: 50,
        userSelect: "none",
      }}
    >
      {/* Left: directory basename */}
      <span>{dirName}</span>

      {/* Center: model name */}
      <span>{modelLabel}</span>

      {/* Right: plan + thinking modes */}
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ color: planMode ? amber : dim }}>
          Plan {planMode ? "on" : "off"}
        </span>
        <span style={{ color: separatorColor }}>|</span>
        <span style={{ color: thinkingMode ? green : dim }}>
          Thinking {thinkingMode ? "on" : "off"}
        </span>
      </span>
    </div>
  );
}
