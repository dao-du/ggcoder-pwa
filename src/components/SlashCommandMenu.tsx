import type { CSSProperties } from "react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

const COMMANDS = [
  { cmd: "/plan", desc: "Toggle plan mode (on/off)" },
  { cmd: "/plans", desc: "Open plans pane" },
  { cmd: "/model", desc: "Switch model" },
  { cmd: "/compact", desc: "Compact conversation" },
  { cmd: "/clear", desc: "Clear session" },
  { cmd: "/scan", desc: "Find dead code, bugs, security issues" },
  { cmd: "/verify", desc: "Verify code against docs" },
  { cmd: "/research", desc: "Research best tools and patterns" },
  { cmd: "/init", desc: "Generate CLAUDE.md" },
  { cmd: "/setup-lint", desc: "Generate /fix command" },
  { cmd: "/setup-commit", desc: "Generate /commit command" },
  { cmd: "/setup-tests", desc: "Set up testing" },
  { cmd: "/setup-update", desc: "Generate /update command" },
  { cmd: "/compare", desc: "Compare code against real-world" },
  { cmd: "/quit", desc: "Exit the agent" },
];

export interface SlashCommandMenuHandle {
  getSelected: () => string | null;
  moveUp: () => void;
  moveDown: () => void;
}

interface Props {
  query: string;
  onSelect: (command: string) => void;
  onClose: () => void;
}

const SlashCommandMenu = forwardRef<SlashCommandMenuHandle, Props>(
  ({ query, onSelect, onClose }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);
    const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

    const filtered = useMemo(() => {
      if (!query) return COMMANDS;
      const prefix = "/" + query.toLowerCase();
      return COMMANDS.filter((c) => c.cmd.toLowerCase().startsWith(prefix));
    }, [query]);

    // Reset selection when query changes
    useEffect(() => {
      setSelectedIndex(0);
    }, [query]);

    // Scroll selected item into view
    useEffect(() => {
      const row = rowRefs.current[selectedIndex];
      if (row) {
        row.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }, [selectedIndex]);

    useImperativeHandle(ref, () => ({
      getSelected: () => {
        if (filtered.length === 0) return null;
        return filtered[selectedIndex]?.cmd ?? null;
      },
      moveUp: () => {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
      },
      moveDown: () => {
        setSelectedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
      },
    }));

    // Close on click outside
    const containerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
          onClose();
        }
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, [onClose]);

    if (filtered.length === 0) return null;

    return (
      <div ref={containerRef} style={styles.container}>
        <div ref={listRef} style={styles.list}>
          {filtered.map((item, i) => (
            <div
              key={item.cmd}
              ref={(el) => {
                rowRefs.current[i] = el;
              }}
              style={{
                ...styles.row,
                ...(i === selectedIndex ? styles.rowSelected : {}),
              }}
              onMouseEnter={() => setSelectedIndex(i)}
              onClick={() => onSelect(item.cmd)}
            >
              <span style={styles.cmd}>{item.cmd}</span>
              <span style={styles.desc}>{item.desc}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
);

SlashCommandMenu.displayName = "SlashCommandMenu";

const styles: Record<string, CSSProperties> = {
  container: {
    position: "absolute",
    bottom: "100%",
    left: 0,
    right: 0,
    zIndex: 50,
    marginBottom: 4,
  },
  list: {
    background: "#161b22",
    border: "1px solid #30363d",
    borderRadius: 8,
    maxHeight: 250,
    overflowY: "auto",
    padding: "4px 0",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "8px 12px",
    cursor: "pointer",
    transition: "background 0.1s",
  },
  rowSelected: {
    background: "#1f2937",
  },
  cmd: {
    color: "#58a6ff",
    fontFamily: "monospace",
    fontWeight: 700,
    fontSize: 14,
    flexShrink: 0,
  },
  desc: {
    color: "#8b949e",
    fontSize: 13,
    fontFamily: "inherit",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
};

export default SlashCommandMenu;
