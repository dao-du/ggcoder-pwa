import { useState } from "react";
import type { ChatMessage, ToolCallInfo } from "../types";
import ToolCallBlock from "./ToolCallBlock";
import Markdown from "./Markdown";

interface Props {
  message: ChatMessage;
}

const TOOL_ICONS: Record<string, string> = {
  read: "📄", bash: "💻", edit: "✏️", write: "📝",
  find: "🔍", grep: "🔎", ls: "📁", web_fetch: "🌐", web_search: "🔎",
};

function toolSummary(toolCalls: ToolCallInfo[]): string {
  const counts: Record<string, number> = {};
  for (const tc of toolCalls) {
    counts[tc.tool] = (counts[tc.tool] || 0) + 1;
  }
  const parts = Object.entries(counts).map(([tool, count]) => {
    const icon = TOOL_ICONS[tool] ?? "🔧";
    return count > 1 ? `${icon} ${tool} ×${count}` : `${icon} ${tool}`;
  });
  return parts.join("  ");
}

export default function MessageBubble({ message }: Props) {
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const hasToolCalls = message.toolCalls && message.toolCalls.length > 0;
  const hasThinking = !!message.thinking;

  if (message.role === "user") {
    return (
      <div className="flex justify-end px-4 py-1">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[var(--user-bubble)] px-4 py-2.5 leading-relaxed text-white" style={{ fontSize: "var(--chat-font-size)" }}>
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="px-4 py-1">
      {/* Thinking — collapsed subtle pill */}
      {hasThinking && <ThinkingPill text={message.thinking!} />}

      {/* Tool calls — collapsed summary */}
      {hasToolCalls && (
        <div className="my-1">
          <button
            onClick={() => setToolsExpanded(!toolsExpanded)}
            className="flex w-full items-center gap-2 rounded-lg border border-[var(--border)]/40 bg-[var(--bg-secondary)]/40 px-3 py-2 text-left transition-colors active:bg-[var(--bg-secondary)]"
          >
            <span className="text-xs text-[var(--text-secondary)]">
              {toolSummary(message.toolCalls!)}
            </span>
            {message.isStreaming && message.toolCalls!.some(tc => !tc.done) && (
              <span className="animate-pulse text-xs text-yellow-400">running…</span>
            )}
            <span className="ml-auto text-xs text-[var(--text-secondary)]/50">
              {toolsExpanded ? "▲" : `${message.toolCalls!.length} tool${message.toolCalls!.length !== 1 ? "s" : ""} ▼`}
            </span>
          </button>
          {toolsExpanded && (
            <div className="mt-1 space-y-0.5 pl-1">
              {message.toolCalls!.map((tc) => (
                <ToolCallBlock key={tc.id} toolCall={tc} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main text content — rendered as markdown */}
      {message.content && (
        <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-[var(--bg-secondary)] px-4 py-2.5 leading-relaxed text-[var(--text-primary)]" style={{ fontSize: "var(--chat-font-size)" }}>
          <Markdown>{message.content}</Markdown>
          {message.isStreaming && (
            <span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-[var(--accent)]" />
          )}
        </div>
      )}
    </div>
  );
}

function ThinkingPill({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const lines = text.split("\n").length;
  const preview = text.slice(0, 60).replace(/\n/g, " ");

  return (
    <div className="my-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 rounded-full border border-[var(--border)]/30 bg-[var(--bg-secondary)]/30 px-2.5 py-1 text-xs text-[var(--text-secondary)] transition-colors active:bg-[var(--bg-secondary)]"
      >
        <span>💭</span>
        <span className="italic">{expanded ? "Thinking" : `${preview}${text.length > 60 ? "…" : ""}`}</span>
        <span className="text-[10px] opacity-50">{expanded ? "▲" : `(${lines}L) ▼`}</span>
      </button>
      {expanded && (
        <div className="mt-1 max-h-48 overflow-auto rounded-lg bg-[var(--bg-secondary)]/50 px-3 py-2 text-xs italic leading-relaxed text-[var(--text-secondary)]">
          {text}
        </div>
      )}
    </div>
  );
}
