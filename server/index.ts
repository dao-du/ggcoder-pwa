import express from "express";
import { createServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  discoverSessions,
  getSocketPath,
  loadSessionHistory,
} from "./session-manager.js";
import { RCClient } from "./rc-client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT ?? "3847", 10);

const app = express();
const server = createServer(app);

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "..", "dist");
  console.log(`[server] Serving static files from: ${distPath}`);

  // Force no-cache on SW and HTML so browsers always get the latest
  app.use("/sw.js", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    next();
  });

  app.use(express.static(distPath, {
    maxAge: "1h",
    setHeaders(res, filePath) {
      // Never cache the HTML shell or SW registration
      if (filePath.endsWith(".html") || filePath.endsWith("registerSW.js")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      }
    },
  }));
  app.get("/{*path}", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// WebSocket server
const wss = new WebSocketServer({ server, path: "/ws" });

// Track per-client RC connections
const clientConnections = new Map<WebSocket, RCClient>();
let wsClientId = 0;

wss.on("connection", (ws: WebSocket) => {
  const clientId = ++wsClientId;
  console.log(`[ws] Client #${clientId} connected`);

  ws.on("message", async (raw: Buffer) => {
    const rawStr = raw.toString();
    console.log(`[ws] ← Client #${clientId}: ${rawStr.slice(0, 500)}`);

    let msg: { action: string; [key: string]: unknown };
    try {
      msg = JSON.parse(rawStr);
    } catch {
      sendError(ws, clientId, "Invalid JSON");
      return;
    }

    switch (msg.action) {
      case "list_sessions": {
        try {
          const sessions = await discoverSessions();
          console.log(
            `[ws] → Client #${clientId}: sessions (${sessions.length} found)`
          );
          sendJson(ws, { event: "sessions", sessions });
        } catch (err) {
          sendError(ws, clientId, `Failed to list sessions: ${err}`);
        }
        break;
      }

      case "connect": {
        const sessionId = msg.sessionId as string;

        // Validate sessionId — must match rc-<digits> to prevent path traversal
        if (!/^rc-\d+$/.test(sessionId)) {
          sendError(ws, clientId, `Invalid session ID: ${sessionId}`);
          break;
        }

        console.log(
          `[ws] Client #${clientId} connecting to session: ${sessionId}`
        );

        // Disconnect existing RC connection if any
        // removeAllListeners() in disconnect() prevents the race condition
        // where the old client's async "disconnected" event deletes the new one
        const existing = clientConnections.get(ws);
        if (existing) {
          console.log(`[ws] Disconnecting previous RC connection`);
          existing.disconnect();
          clientConnections.delete(ws);
        }

        const socketPath = getSocketPath(sessionId);
        const rcClient = new RCClient(socketPath);

        try {
          await rcClient.connect();
          clientConnections.set(ws, rcClient);

          // Forward all RC events to the browser
          rcClient.on("event", (event: { type: string; [key: string]: unknown }) => {
            const { type, ...rest } = event;
            console.log(
              `[ws] → Client #${clientId}: forwarding RC event: ${type}`
            );
            sendJson(ws, { event: type, ...rest });
          });

          rcClient.on("disconnected", () => {
            // Guard: only delete if WE are still the active connection
            if (clientConnections.get(ws) === rcClient) {
              console.log(
                `[ws] RC session disconnected for client #${clientId}`
              );
              clientConnections.delete(ws);
              sendJson(ws, { event: "error", message: "Session disconnected" });
            }
          });

          rcClient.on("error", (err: Error) => {
            console.log(`[ws] RC error for client #${clientId}: ${err.message}`);
            sendJson(ws, { event: "error", message: `RC error: ${err.message}` });
          });

          // Send connected confirmation
          sendJson(ws, { event: "connected", sessionId });
          console.log(
            `[ws] → Client #${clientId}: connected to ${sessionId}`
          );

          // Load and send conversation history
          const pidStr = sessionId.replace("rc-", "");
          const pid = parseInt(pidStr, 10);
          if (!isNaN(pid)) {
            const history = loadSessionHistory(pid);
            if (history.length > 0) {
              console.log(
                `[ws] → Client #${clientId}: sending ${history.length} history messages`
              );
              sendJson(ws, { event: "history", messages: history });
            }
          }
        } catch (err) {
          const errMsg = `Failed to connect to session: ${err instanceof Error ? err.message : err}`;
          console.log(`[ws] Error: ${errMsg}`);
          sendJson(ws, { event: "error", message: errMsg });
        }
        break;
      }

      case "prompt": {
        const rc = clientConnections.get(ws);
        if (!rc?.connected) {
          sendError(ws, clientId, "Not connected to a session");
          return;
        }
        const text = msg.text as string;
        console.log(
          `[ws] Client #${clientId} sending prompt: "${text.slice(0, 100)}"`
        );
        try {
          const cmdId = rc.sendPrompt(text);
          console.log(`[ws] Prompt sent with id: ${cmdId}`);
        } catch (err) {
          sendError(
            ws,
            clientId,
            `Failed to send prompt: ${err instanceof Error ? err.message : err}`
          );
        }
        break;
      }

      case "abort": {
        const rc = clientConnections.get(ws);
        if (!rc?.connected) {
          sendError(ws, clientId, "Not connected to a session");
          return;
        }
        console.log(`[ws] Client #${clientId} sending abort`);
        try {
          rc.sendAbort();
        } catch (err) {
          sendError(
            ws,
            clientId,
            `Failed to abort: ${err instanceof Error ? err.message : err}`
          );
        }
        break;
      }

      default:
        sendError(ws, clientId, `Unknown action: ${msg.action}`);
    }
  });

  ws.on("close", () => {
    const rc = clientConnections.get(ws);
    if (rc) {
      rc.disconnect();
      clientConnections.delete(ws);
    }
    console.log(`[ws] Client #${clientId} disconnected`);
  });

  ws.on("error", (err) => {
    console.log(`[ws] Client #${clientId} error: ${err.message}`);
  });
});

function sendJson(ws: WebSocket, data: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    const json = JSON.stringify(data);
    ws.send(json);
  }
}

function sendError(ws: WebSocket, clientId: number, message: string): void {
  console.log(`[ws] → Client #${clientId}: error: ${message}`);
  sendJson(ws, { event: "error", message });
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[server] Bridge server running on http://0.0.0.0:${PORT}`);
  console.log(`[server] WebSocket endpoint: ws://0.0.0.0:${PORT}/ws`);
});
