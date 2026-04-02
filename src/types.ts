// Session info
export interface Session {
  id: string;
  pid: number;
  cwd: string;
  status: "idle" | "working" | "unknown";
}

// WebSocket messages: Client → Server
export interface ListSessionsAction {
  action: "list_sessions";
}

export interface ConnectAction {
  action: "connect";
  sessionId: string;
}

export interface PromptAction {
  action: "prompt";
  text: string;
}

export interface AbortAction {
  action: "abort";
}

export type ClientMessage =
  | ListSessionsAction
  | ConnectAction
  | PromptAction
  | AbortAction;

// WebSocket messages: Server → Client
export interface SessionsEvent {
  event: "sessions";
  sessions: Session[];
}

export interface ConnectedEvent {
  event: "connected";
  sessionId: string;
}

export interface HistoryEvent {
  event: "history";
  messages: HistoryMessage[];
}

export interface HistoryMessage {
  role: string;
  content: string | HistoryContentBlock[];
}

export interface HistoryContentBlock {
  type: string;
  text?: string;
  name?: string;
  id?: string;
  args?: Record<string, unknown>;
  toolCallId?: string;
  content?: string;
}

export interface ErrorEvent {
  event: "error";
  message: string;
}

// UI state types
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  thinking?: string;
  toolCalls?: ToolCallInfo[];
  isStreaming?: boolean;
}

export interface ToolCallInfo {
  id: string;
  tool: string;
  params: Record<string, unknown>;
  output: string;
  done: boolean;
}
