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

  const [isFocused, setIsFocused] = useState(false);

  return (
    <>
      <style>{`
        @keyframes input-glow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
      <div className="safe-bottom relative bg-[var(--bg-primary)] px-3 py-1.5">
        {showSlashMenu && (
          <SlashCommandMenu
            ref={menuRef}
            query={slashQuery}
            onSelect={handleSlashSelect}
            onClose={() => setShowSlashMenu(false)}
          />
        )}
        {/* Animated gradient border wrapper */}
        <div
          style={{
            padding: isGenerating ? 1 : 2,
            borderRadius: 10,
            background: isGenerating
              ? "var(--border)"
              : "linear-gradient(270deg, #3b82f6, #8b5cf6, #ec4899, #3b82f6)",
            backgroundSize: isGenerating ? "100% 100%" : "300% 300%",
            animation: isGenerating ? "none" : "input-glow 4s ease infinite",
            opacity: isGenerating ? 0.5 : isFocused ? 1 : 0.6,
            transition: "opacity 0.2s",
          }}
        >
          {/* Inner solid background */}
          <div
            style={{
              borderRadius: 8,
              backgroundColor: "var(--bg-primary)",
            }}
          >
            <div className="flex items-center gap-1.5">
              <div className="flex-1">
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="Send a prompt…"
                  rows={1}
                  className={[
                    "w-full resize-none bg-transparent text-[15px] leading-tight outline-none",
                    isGenerating
                      ? "px-3 py-1.5 text-[var(--text-secondary)] placeholder:text-[var(--text-secondary)]/40"
                      : "px-4 py-2.5 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]",
                    "transition-all duration-200",
                  ].join(" ")}
                />
              </div>
              {isGenerating ? (
                <button
                  onClick={onAbort}
                  className="mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-600/80 text-xs text-white active:bg-red-700"
                  aria-label="Abort"
                >
                  ■
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!text.trim()}
                  className="mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/60 text-xs text-white disabled:opacity-30 active:opacity-80"
                  aria-label="Send"
                >
                  ▶
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
