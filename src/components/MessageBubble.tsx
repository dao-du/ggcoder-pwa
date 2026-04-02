import type { ChatMessage } from "../types";
import ToolCallBlock from "./ToolCallBlock";
import ThinkingIndicator from "./ThinkingIndicator";

interface Props {
  message: ChatMessage;
}

export default function MessageBubble({ message }: Props) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end px-4 py-1">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[var(--user-bubble)] px-4 py-2 text-sm text-white">
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="px-4 py-1">
      {message.thinking && <ThinkingIndicator text={message.thinking} />}
      {message.content && (
        <div className="max-w-[90%] rounded-2xl rounded-bl-md bg-[var(--bg-secondary)] px-4 py-2 text-sm whitespace-pre-wrap text-[var(--text-primary)]">
          {message.content}
          {message.isStreaming && (
            <span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-[var(--accent)]" />
          )}
        </div>
      )}
      {message.toolCalls?.map((tc) => (
        <ToolCallBlock key={tc.id} toolCall={tc} />
      ))}
    </div>
  );
}
