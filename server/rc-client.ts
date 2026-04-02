import net from "node:net";
import { EventEmitter } from "node:events";

// RC uses {command: "...", id: "..."} not {type: "..."}
export interface RCCommand {
  id: string;
  command: "prompt" | "abort" | "get_state";
  text?: string;
}

export interface RCEvent {
  type: string;
  [key: string]: unknown;
}

let cmdCounter = 0;
function nextCmdId(): string {
  return `pwa-${Date.now()}-${++cmdCounter}`;
}

export class RCClient extends EventEmitter {
  private socket: net.Socket | null = null;
  private buffer = "";
  private _connected = false;
  private label: string;

  constructor(private socketPath: string) {
    super();
    this.label = socketPath.split("/").pop() ?? socketPath;
  }

  get connected(): boolean {
    return this._connected;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`[rc-client] Connecting to ${this.label}...`);
      this.socket = net.createConnection({ path: this.socketPath });

      this.socket.on("connect", () => {
        this._connected = true;
        console.log(`[rc-client] Connected to ${this.label}`);
        this.emit("connected");
        resolve();
      });

      this.socket.on("data", (chunk: Buffer) => {
        this.buffer += chunk.toString("utf-8");
        const lines = this.buffer.split("\n");
        this.buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const event = JSON.parse(trimmed) as RCEvent;
            console.log(
              `[rc-client] ← ${this.label}: ${event.type}${event.text ? ` "${(event.text as string).slice(0, 80)}"` : ""}${event.tool ? ` tool=${event.tool}` : ""}${event.id && event.type !== "text_delta" && event.type !== "thinking_delta" ? ` id=${event.id}` : ""}`
            );
            this.emit("event", event);
          } catch {
            console.log(
              `[rc-client] ← ${this.label}: [malformed] ${trimmed.slice(0, 100)}`
            );
          }
        }
      });

      this.socket.on("error", (err: Error) => {
        console.log(`[rc-client] Error on ${this.label}: ${err.message}`);
        if (!this._connected) {
          reject(err);
        } else {
          this.emit("error", err);
        }
      });

      this.socket.on("close", () => {
        console.log(`[rc-client] Disconnected from ${this.label}`);
        this._connected = false;
        this.emit("disconnected");
      });
    });
  }

  sendPrompt(text: string): string {
    const id = nextCmdId();
    this.sendRaw({ id, command: "prompt", text });
    return id;
  }

  sendAbort(): string {
    const id = nextCmdId();
    this.sendRaw({ id, command: "abort" });
    return id;
  }

  private sendRaw(command: RCCommand): void {
    if (!this.socket || !this._connected) {
      throw new Error("Not connected");
    }
    const line = JSON.stringify(command);
    console.log(`[rc-client] → ${this.label}: ${line}`);
    this.socket.write(line + "\n");
  }

  disconnect(): void {
    if (this.socket) {
      console.log(`[rc-client] Disconnecting from ${this.label}`);
      this.socket.destroy();
      this.socket = null;
      this._connected = false;
    }
    this.removeAllListeners();
  }
}
