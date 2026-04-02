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

const TOOL_LABELS: Record<string, (params: Record<string, unknown>) => string> = {
  read: (p) => `Read ${fileName(p.file_path)}`,
  bash: (p) => `Ran command${p.command ? `: ${truncate(String(p.command), 40)}` : ""}`,
  edit: (p) => `Edited ${fileName(p.file_path)}`,
  write: (p) => `Wrote ${fileName(p.file_path)}`,
  find: (p) => `Found files${p.pattern ? ` matching ${truncate(String(p.pattern), 30)}` : ""}`,
  grep: (p) => `Searched${p.pattern ? ` for "${truncate(String(p.pattern), 30)}"` : ""}`,
  ls: (p) => `Listed ${truncate(String(p.path || "."), 30)}`,
  web_fetch: (p) => `Fetched ${truncate(String(p.url || ""), 40)}`,
  web_search: (p) => `Searched web${p.query ? `: ${truncate(String(p.query), 30)}` : ""}`,
};

function fileName(p: unknown): string {
  const s = String(p || "");
  const parts = s.split("/");
  return parts[parts.length - 1] || s;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

const MAX_OUTPUT_LENGTH = 10000;

interface Props {
  toolCall: ToolCallInfo;
}

export default function ToolCallBlock({ toolCall }: Props) {
  const [expanded, setExpanded] = useState(false);
  const icon = TOOL_ICONS[toolCall.tool] ?? "🔧";
  const labelFn = TOOL_LABELS[toolCall.tool];
  const label = labelFn ? labelFn(toolCall.params) : toolCall.tool;

  const output =
    toolCall.output.length > MAX_OUTPUT_LENGTH
      ? toolCall.output.slice(0, MAX_OUTPUT_LENGTH) + "\n…(truncated)"
      : toolCall.output;

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="my-0.5 flex w-full flex-col rounded-lg border border-[var(--border)]/50 bg-[var(--bg-secondary)]/60 text-left transition-colors active:bg-[var(--bg-secondary)]"
    >
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs">
        <span className="text-sm">{icon}</span>
        <span className="text-[var(--text-secondary)]">{label}</span>
        {!toolCall.done && (
          <span className="animate-pulse text-yellow-400">…</span>
        )}
        <span className="ml-auto text-[var(--text-secondary)]/60">
          {expanded ? "▲" : "▼"}
        </span>
      </div>
      {expanded && (
        <div className="border-t border-[var(--border)]/30 px-2.5 py-2">
          {output ? (
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all font-mono text-xs text-[var(--text-primary)]/80">
              {output}
            </pre>
          ) : (
            <span className="text-xs italic text-[var(--text-secondary)]">No output</span>
          )}
        </div>
      )}
    </button>
  );
}
