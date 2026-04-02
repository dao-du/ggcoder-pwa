import { useState, useRef, useEffect } from "react";
import SlashCommandMenu, {
  type SlashCommandMenuHandle,
} from "./SlashCommandMenu";

interface Props {
  onSend: (text: string) => void;
  onAbort: () => void;
  isGenerating: boolean;
}

export default function PromptInput({ onSend, onAbort, isGenerating }: Props) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<SlashCommandMenuHandle>(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [text]);

  // Track slash command state
  useEffect(() => {
    if (text.startsWith("/")) {
      setShowSlashMenu(true);
      setSlashQuery(text.slice(1));
    } else {
      setShowSlashMenu(false);
      setSlashQuery("");
    }
  }, [text]);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || isGenerating) return;
    onSend(trimmed);
    setText("");
    setShowSlashMenu(false);
  };

  const handleSlashSelect = (command: string) => {
    onSend(command);
    setText("");
    setShowSlashMenu(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSlashMenu && menuRef.current) {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        menuRef.current.moveUp();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        menuRef.current.moveDown();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const selected = menuRef.current.getSelected();
        if (selected) {
          handleSlashSelect(selected);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowSlashMenu(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <>
      <style>{`
        @keyframes prompt-gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .prompt-gradient-border {
          background: linear-gradient(90deg, #fbbf24, #38bdf8, #34d399, #a78bfa, #fbbf24);
          background-size: 300% 100%;
          animation: prompt-gradient-shift 4s ease infinite;
          border-radius: 10px;
          padding: 1.5px;
        }
        .prompt-gradient-border > textarea {
          border-radius: 8px;
          border: none;
        }
      `}</style>
      <div className="safe-bottom border-t border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2">
        <div className="relative flex items-end gap-2">
          {showSlashMenu && (
            <SlashCommandMenu
              ref={menuRef}
              query={slashQuery}
              onSelect={handleSlashSelect}
              onClose={() => setShowSlashMenu(false)}
            />
          )}
          <div className="prompt-gradient-border flex-1">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Send a prompt…"
              rows={1}
              className="w-full resize-none bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
            />
          </div>
          {isGenerating ? (
            <button
              onClick={onAbort}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white active:bg-red-700"
              aria-label="Abort"
            >
              ■
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!text.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-white disabled:opacity-40 active:opacity-80"
              aria-label="Send"
            >
              ▶
            </button>
          )}
        </div>
      </div>
    </>
  );
}
