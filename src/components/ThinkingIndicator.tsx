import { useState } from "react";

interface Props {
  text: string;
}

export default function ThinkingIndicator({ text }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;

  return (
    <div className="my-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs italic text-[var(--text-secondary)]"
      >
        <span className="animate-pulse">💭</span>
        <span>Thinking…</span>
        <span>{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="mt-1 rounded-lg bg-[var(--bg-secondary)] px-3 py-2 text-sm italic text-[var(--text-secondary)]">
          {text}
        </div>
      )}
    </div>
  );
}
