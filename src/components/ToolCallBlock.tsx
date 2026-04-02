import { useState } from "react";
import type { ToolCallInfo } from "../types";

const TOOL_ICONS: Record<string, string> = {
  read: "📄",
  bash: "💻",
  edit: "✏️",
  write: "📝",
  find: "🔍",
  grep: "🔎",
  ls: "📁",
  web_fetch: "🌐",
  web_search: "🔎",
};

const MAX_OUTPUT_LENGTH = 10000;

interface Props {
  toolCall: ToolCallInfo;
}

export default function ToolCallBlock({ toolCall }: Props) {
  const [expanded, setExpanded] = useState(false);
  const icon = TOOL_ICONS[toolCall.tool] ?? "🔧";

  const paramsStr = Object.entries(toolCall.params)
    .map(([k, v]) => {
      const val = typeof v === "string" ? v : JSON.stringify(v);
      return `${k}: ${val.length > 80 ? val.slice(0, 80) + "…" : val}`;
    })
    .join(", ");

  const output =
    toolCall.output.length > MAX_OUTPUT_LENGTH
      ? toolCall.output.slice(0, MAX_OUTPUT_LENGTH) + "\n…(truncated)"
      : toolCall.output;

  return (
    <div className="my-1 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
      >
        <span>{icon}</span>
        <span className="font-mono font-medium text-[var(--accent)]">
          {toolCall.tool}
        </span>
        {!toolCall.done && (
          <span className="animate-pulse text-xs text-yellow-400">
            running…
          </span>
        )}
        <span className="ml-auto text-xs text-[var(--text-secondary)]">
          {expanded ? "▲" : "▼"}
        </span>
      </button>
      {expanded && (
        <div className="border-t border-[var(--border)] px-3 py-2">
          <div className="mb-1 font-mono text-xs text-[var(--text-secondary)]">
            {paramsStr}
          </div>
          {output && (
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all font-mono text-xs text-[var(--text-primary)]">
              {output}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
