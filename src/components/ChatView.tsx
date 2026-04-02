import { useEffect, useReducer, useRef } from "react";
import type {
  ChatMessage,
  ClientMessage,
  ToolCallInfo,
  HistoryMessage,
  HistoryContentBlock,
} from "../types";
import { useAutoScroll } from "../hooks/useAutoScroll";
import MessageBubble from "./MessageBubble";
import PromptInput from "./PromptInput";
import ActivityIndicator from "./ActivityIndicator";

interface SessionMeta {
  cwd?: string;
  model?: string;
  planMode: boolean;
  thinkingMode: boolean;
}

interface Props {
  sessionId: string;
  queueTick: number;
  drainMessages: () => unknown[];
  send: (msg: ClientMessage) => void;
  onSessionMeta?: (metaOrUpdater: SessionMeta | ((prev: SessionMeta) => SessionMeta)) => void;
  externalCommand?: string | null;
  commandTick?: number;
}

type Action =
  | { type: "text_delta"; text: string }
  | { type: "thinking_delta"; text: string }
  | { type: "tool_call_start"; tool: string; id: string; params: Record<string, unknown> }
  | { type: "tool_call_update"; id: string; output: string }
  | { type: "tool_call_end"; id: string }
  | { type: "turn_end" }
  | { type: "agent_done" }
  | { type: "result" }
  | { type: "user_prompt"; text: string }
  | { type: "connected" }
  | { type: "history"; messages: HistoryMessage[] };

interface ActivityState {
  currentTool?: string;
  isThinking: boolean;
  startTime?: number;
  tokenCount: number;
  thinkingStart?: number;
  thinkingDuration: number;
}

interface CompletionInfo {
  elapsed: string;
  tokenCount: number;
  turns: number;
}

interface State {
  messages: ChatMessage[];
  isGenerating: boolean;
  activity: ActivityState;
  completion: CompletionInfo | null;
  turnCount: number;
}

let msgCounter = 0;
function nextId() {
  return `msg-${++msgCounter}`;
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function formatTokens(n: number): string {
  return n > 999 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function getOrCreateAssistantMsg(messages: ChatMessage[]): ChatMessage[] {
  const last = messages[messages.length - 1];
  if (last && last.role === "assistant" && last.isStreaming) {
    return [...messages];
  }
  return [
    ...messages,
    { id: nextId(), role: "assistant", content: "", thinking: "", toolCalls: [], isStreaming: true },
  ];
}

function convertHistory(historyMessages: HistoryMessage[]): ChatMessage[] {
  const result: ChatMessage[] = [];
  for (const hm of historyMessages) {
    if (hm.role === "user") {
      let text = "";
      if (typeof hm.content === "string") text = hm.content;
      else if (Array.isArray(hm.content)) {
        text = hm.content
          .filter((b: HistoryContentBlock) => b.type === "text")
          .map((b: HistoryContentBlock) => b.text ?? "")
          .join("\n");
      }
      if (text) result.push({ id: nextId(), role: "user", content: text });
    } else if (hm.role === "assistant") {
      const blocks = Array.isArray(hm.content) ? hm.content : [];
      let content = "";
      let thinking = "";
      const toolCalls: ToolCallInfo[] = [];
      for (const block of blocks as HistoryContentBlock[]) {
        if (block.type === "text") content += (block.text ?? "") + "\n";
        else if (block.type === "thinking") thinking += (block.text ?? "") + "\n";
        else if (block.type === "tool_call") {
          toolCalls.push({
            id: block.id ?? nextId(), tool: block.name ?? "unknown",
            params: block.args ?? {}, output: "", done: true,
          });
        }
      }
      if (content || thinking || toolCalls.length > 0) {
        result.push({
          id: nextId(), role: "assistant", content: content.trim(),
          thinking: thinking.trim() || undefined,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined, isStreaming: false,
        });
      }
    } else if (hm.role === "tool") {
      const blocks = Array.isArray(hm.content) ? hm.content : [];
      const prevMsg = result[result.length - 1];
      if (prevMsg?.role === "assistant" && prevMsg.toolCalls) {
        for (const block of blocks as HistoryContentBlock[]) {
          if (block.type === "tool_result" && block.toolCallId) {
            const tc = prevMsg.toolCalls.find((t) => t.id === block.toolCallId);
            if (tc) tc.output = typeof block.content === "string" ? block.content.slice(0, 2000) : "";
          }
        }
      }
    }
  }
  return result;
}

const INITIAL_ACTIVITY: ActivityState = {
  isThinking: false, tokenCount: 0, thinkingDuration: 0,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "connected":
      return { messages: [], isGenerating: false, activity: { ...INITIAL_ACTIVITY }, completion: null, turnCount: 0 };

    case "history": {
      const historyMsgs = convertHistory(action.messages);
      return { messages: historyMsgs, isGenerating: false, activity: { ...INITIAL_ACTIVITY }, completion: null, turnCount: 0 };
    }

    case "user_prompt":
      return {
        ...state,
        messages: [...state.messages, { id: nextId(), role: "user", content: action.text }],
        isGenerating: true,
        activity: { ...INITIAL_ACTIVITY, startTime: Date.now() },
        completion: null,
        turnCount: 0,
      };

    case "text_delta": {
      const msgs = getOrCreateAssistantMsg(state.messages);
      const last = msgs[msgs.length - 1];
      last.content += action.text;
      const newTokens = Math.ceil(action.text.length / 4);
      const thinkingDuration = state.activity.isThinking && state.activity.thinkingStart
        ? Math.floor((Date.now() - state.activity.thinkingStart) / 1000)
        : state.activity.thinkingDuration;
      return {
        ...state, messages: msgs, isGenerating: true,
        activity: {
          ...state.activity, isThinking: false,
          tokenCount: state.activity.tokenCount + newTokens, thinkingDuration,
          startTime: state.activity.startTime ?? Date.now(),
        },
      };
    }

    case "thinking_delta": {
      const msgs = getOrCreateAssistantMsg(state.messages);
      const last = msgs[msgs.length - 1];
      last.thinking = (last.thinking ?? "") + action.text;
      return {
        ...state, messages: msgs, isGenerating: true,
        activity: {
          ...state.activity, isThinking: true,
          thinkingStart: state.activity.thinkingStart ?? Date.now(),
          startTime: state.activity.startTime ?? Date.now(),
        },
      };
    }

    case "tool_call_start": {
      const msgs = getOrCreateAssistantMsg(state.messages);
      const last = msgs[msgs.length - 1];
      last.toolCalls = [...(last.toolCalls ?? []), {
        id: action.id, tool: action.tool, params: action.params, output: "", done: false,
      }];
      return {
        ...state, messages: msgs, isGenerating: true,
        activity: {
          ...state.activity, currentTool: action.tool, isThinking: false,
          startTime: state.activity.startTime ?? Date.now(),
        },
      };
    }

    case "tool_call_update": {
      const msgs = [...state.messages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        const tc = msgs[i].toolCalls?.find((t) => t.id === action.id);
        if (tc) { tc.output += action.output; break; }
      }
      return { ...state, messages: msgs };
    }

    case "tool_call_end": {
      const msgs = [...state.messages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        const tc = msgs[i].toolCalls?.find((t) => t.id === action.id);
        if (tc) { tc.done = true; break; }
      }
      return { ...state, messages: msgs, activity: { ...state.activity, currentTool: undefined } };
    }

    case "turn_end":
      return { ...state, turnCount: state.turnCount + 1 };

    case "agent_done":
    case "result": {
      const msgs = state.messages.map((m) => m.isStreaming ? { ...m, isStreaming: false } : m);
      const elapsed = state.activity.startTime ? formatElapsed(Date.now() - state.activity.startTime) : "0s";
      return {
        messages: msgs, isGenerating: false, activity: { ...INITIAL_ACTIVITY },
        completion: {
          elapsed, tokenCount: state.activity.tokenCount, turns: state.turnCount + 1,
        },
        turnCount: 0,
      };
    }

    default:
      return state;
  }
}

export default function ChatView({ sessionId, queueTick, drainMessages, send, onSessionMeta, externalCommand, commandTick }: Props) {
  const [state, dispatch] = useReducer(reducer, {
    messages: [], isGenerating: false, activity: { ...INITIAL_ACTIVITY }, completion: null, turnCount: 0,
  });
  const scrollRef = useAutoScroll([state.messages, state.isGenerating, state.completion]);

  useEffect(() => {
    const messages = drainMessages();
    for (const raw of messages) {
      const msg = raw as { event: string; [key: string]: unknown };
      if (!msg.event) continue;

      switch (msg.event) {
        case "connected":
          dispatch({ type: "connected" });
          break;
        case "history":
          dispatch({ type: "history", messages: msg.messages as HistoryMessage[] });
          break;
        case "text_delta": {
          const text = msg.text as string;
          dispatch({ type: "text_delta", text });
          // Detect plan mode toggling from agent response text
          if (onSessionMeta && text.includes("Plan mode")) {
            if (text.includes("enabled") || text.includes("on")) {
              onSessionMeta((prev) => ({ ...prev, planMode: true }));
            } else if (text.includes("disabled") || text.includes("off")) {
              onSessionMeta((prev) => ({ ...prev, planMode: false }));
            }
          }
          // Detect thinking mode toggling from agent response text
          if (onSessionMeta && (text.includes("Thinking") || text.includes("thinking"))) {
            if (text.includes("enabled") || text.includes("on")) {
              onSessionMeta((prev) => ({ ...prev, thinkingMode: true }));
            } else if (text.includes("disabled") || text.includes("off")) {
              onSessionMeta((prev) => ({ ...prev, thinkingMode: false }));
            }
          }
          break;
        }
        case "thinking_delta":
          dispatch({ type: "thinking_delta", text: msg.text as string });
          break;
        case "tool_call_start":
          dispatch({
            type: "tool_call_start", tool: msg.tool as string,
            id: msg.id as string, params: msg.params as Record<string, unknown>,
          });
          break;
        case "tool_call_update":
          dispatch({ type: "tool_call_update", id: msg.id as string, output: msg.output as string });
          break;
        case "tool_call_end":
          dispatch({ type: "tool_call_end", id: msg.id as string });
          break;
        case "turn_end":
          dispatch({ type: "turn_end" });
          break;
        case "agent_done":
          dispatch({ type: "agent_done" });
          break;
        case "result":
          dispatch({ type: "result" });
          break;
        // Track session meta from events
        case "session_start":
        case "model_change":
          if (onSessionMeta) {
            onSessionMeta({
              cwd: msg.cwd as string | undefined,
              model: msg.model as string | undefined,
              planMode: false,
              thinkingMode: true,
            });
          }
          break;
      }
    }
  }, [queueTick, drainMessages, onSessionMeta]);

  // Handle external commands from FooterBar
  const lastCommandTickRef = useRef(commandTick);
  useEffect(() => {
    if (commandTick !== lastCommandTickRef.current && externalCommand) {
      lastCommandTickRef.current = commandTick;
      const isSilent = externalCommand === "/think" || externalCommand === "/plan";
      if (!isSilent) {
        dispatch({ type: "user_prompt", text: externalCommand });
      }
      send({ action: "prompt", text: externalCommand });
    }
  }, [commandTick, externalCommand, send]);

  const handleSend = (text: string) => {
    const trimmed = text.trim();
    const isSilent = trimmed === "/think" || trimmed === "/plan";
    if (!isSilent) {
      dispatch({ type: "user_prompt", text });
    }
    send({ action: "prompt", text });
  };

  const handleAbort = () => {
    send({ action: "abort" });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4">
        {state.messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[var(--text-secondary)]">
            <div className="text-center">
              <div className="mb-2 text-3xl">💬</div>
              <div>Connected to {sessionId}</div>
              <div className="mt-1 text-sm">Loading conversation history...</div>
            </div>
          </div>
        ) : (
          state.messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}

        {/* Completion summary */}
        {state.completion && !state.isGenerating && (
          <div className="px-4 py-2">
            <div className="flex items-center gap-2 font-mono text-sm" style={{ color: "var(--accent)" }}>
              <span>✳</span>
              <span>Completed in {state.completion.elapsed}</span>
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                (↓ {formatTokens(state.completion.tokenCount)} tokens, {state.completion.turns} turn{state.completion.turns !== 1 ? "s" : ""})
              </span>
            </div>
          </div>
        )}
      </div>

      {state.isGenerating && (
        <div className="px-4 py-3" style={{ position: "relative" }}>
          {/* Gradient top border for activity area */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              background: "linear-gradient(90deg, #a855f7, #fbbf24, #60a5fa, #cbd5e1)",
            }}
          />
          <ActivityIndicator
            isActive={state.isGenerating}
            currentTool={state.activity.currentTool}
            isThinking={state.activity.isThinking}
            startTime={state.activity.startTime}
            tokenCount={state.activity.tokenCount}
            thinkingDuration={state.activity.thinkingDuration}
          />
        </div>
      )}

      <PromptInput onSend={handleSend} onAbort={handleAbort} isGenerating={state.isGenerating} />
    </div>
  );
}
