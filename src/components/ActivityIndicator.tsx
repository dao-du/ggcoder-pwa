import { useState, useEffect, useRef } from "react";

interface Props {
  isActive: boolean;
  currentTool?: string;
  isThinking?: boolean;
  startTime?: number;
  tokenCount?: number;
  thinkingDuration?: number;
}

const SPINNER_FRAMES = ["·", "✢", "✳", "✶", "✻", "✽"];
const SHIMMER_WIDTH = 3;

const PHRASES_DEFAULT = [
  "Cogitating", "Ruminating", "Percolating", "Noodling",
  "Discombobulating", "Brainstorming", "Marinating", "Simmering", "Fermenting",
];
const PHRASES_THINKING = [
  "Cogitating", "Ruminating", "Meditating", "Brooding", "Noodling", "Musing",
];
const PHRASES_BASH = ["Incantating", "Summoning", "Invoking"];
const PHRASES_READ = ["Absorbing", "Devouring", "Scrutinizing"];
const PHRASES_WRITE = ["Inscribing", "Etching", "Chiseling"];
const PHRASES_EDIT = ["Surgifying", "Transplanting", "Frankensteining"];

const PULSE_COLORS = [
  "#60a5fa", "#818cf8", "#a78bfa", "#818cf8", "#60a5fa", "#38bdf8",
];

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getPhrasesForState(currentTool?: string, isThinking?: boolean): string[] {
  if (isThinking) return PHRASES_THINKING;
  switch (currentTool) {
    case "bash": return PHRASES_BASH;
    case "read": case "grep": case "find": case "ls": return PHRASES_READ;
    case "write": return PHRASES_WRITE;
    case "edit": return PHRASES_EDIT;
    default: return PHRASES_DEFAULT;
  }
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function formatTokens(n: number): string {
  return n > 999 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export default function ActivityIndicator({
  isActive, currentTool, isThinking, startTime, tokenCount, thinkingDuration,
}: Props) {
  const [spinnerIdx, setSpinnerIdx] = useState(0);
  const [phrase, setPhrase] = useState(() => pickRandom(getPhrasesForState(currentTool, isThinking)));
  const [shimmerPos, setShimmerPos] = useState(0);
  const [colorIdx, setColorIdx] = useState(0);
  const [ellipsisFrame, setEllipsisFrame] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const dirRef = useRef(1);
  const idxRef = useRef(0);
  const toolRef = useRef(currentTool);
  const thinkRef = useRef(isThinking);
  const phraseRef = useRef(phrase);
  toolRef.current = currentTool;
  thinkRef.current = isThinking;
  phraseRef.current = phrase;

  // All animations in a single effect
  useEffect(() => {
    if (!isActive) return;
    idxRef.current = 0;
    dirRef.current = 1;

    const spinner = setInterval(() => {
      let i = idxRef.current + dirRef.current;
      if (i >= SPINNER_FRAMES.length - 1) { i = SPINNER_FRAMES.length - 1; dirRef.current = -1; }
      else if (i <= 0) { i = 0; dirRef.current = 1; }
      idxRef.current = i;
      setSpinnerIdx(i);
    }, 120);

    const phraseInt = setInterval(() => {
      setPhrase(pickRandom(getPhrasesForState(toolRef.current, thinkRef.current)));
    }, 3500);

    const shimmer = setInterval(() => {
      setShimmerPos(p => (p >= phraseRef.current.length + SHIMMER_WIDTH) ? 0 : p + 1);
    }, 100);

    const color = setInterval(() => {
      setColorIdx(p => (p + 1) % PULSE_COLORS.length);
    }, 400);

    const ellipsis = setInterval(() => {
      setEllipsisFrame(p => (p + 1) % 4);
    }, 500);

    const tick = setInterval(() => {
      if (startTime) setElapsed(Date.now() - startTime);
    }, 1000);
    if (startTime) setElapsed(Date.now() - startTime);

    return () => {
      clearInterval(spinner);
      clearInterval(phraseInt);
      clearInterval(shimmer);
      clearInterval(color);
      clearInterval(ellipsis);
      clearInterval(tick);
    };
  }, [isActive, startTime]);

  // Update phrase immediately on tool/thinking change
  useEffect(() => {
    if (isActive) setPhrase(pickRandom(getPhrasesForState(currentTool, isThinking)));
  }, [isActive, currentTool, isThinking]);

  if (!isActive) return null;

  const c = PULSE_COLORS[colorIdx];
  const dots = ".".repeat(ellipsisFrame);

  const shimmerChars = phrase.split("").map((ch, i) => {
    const bright = Math.abs(i - shimmerPos + SHIMMER_WIDTH / 2) < SHIMMER_WIDTH / 2;
    return (
      <span key={i} style={{ opacity: bright ? 1 : 0.4, color: c, transition: "opacity 80ms ease" }}>
        {ch}
      </span>
    );
  });

  const parts: string[] = [];
  if (startTime) parts.push(formatElapsed(elapsed));
  if (tokenCount && tokenCount > 0) parts.push(`↓ ${formatTokens(tokenCount)} tokens`);
  if (thinkingDuration && thinkingDuration > 0) parts.push(`thought for ${thinkingDuration}s`);
  const stats = parts.length > 0 ? `(${parts.join(" · ")})` : "";

  return (
    <div className="flex items-center gap-3 font-mono text-sm">
      <div className="flex items-center gap-1.5 shrink-0">
        <span style={{ color: c, fontSize: "1.1em" }} aria-hidden="true">
          {SPINNER_FRAMES[spinnerIdx]}
        </span>
        <span>
          {shimmerChars}
          <span style={{ color: c, opacity: 0.6 }}>{dots}</span>
        </span>
      </div>
      {stats && (
        <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
          {stats}
        </span>
      )}
    </div>
  );
}
