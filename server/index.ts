import express from "express";
import { createServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import fs from "node:fs";
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
const HTTPS_PORT = parseInt(process.env.HTTPS_PORT ?? "3848", 10);

const app = express();
const server = createServer(app);

// HTTPS server with Tailscale certs (if available)
const certDir = path.join(__dirname, "..", "certs");
const certPath = path.join(certDir, "server.crt");
const keyPath = path.join(certDir, "server.key");
let httpsServer: ReturnType<typeof createHttpsServer> | null = null;

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  httpsServer = createHttpsServer(
    {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
    },
    app
  );
}

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

// Track per-client RC connections
const clientConnections = new Map<WebSocket, RCClient>();
let wsClientId = 0;

function setupWebSocketClient(ws: WebSocket): void {
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

          rcClient.on("event", (event: { type: string; [key: string]: unknown }) => {
            const { type, ...rest } = event;
            console.log(
              `[ws] → Client #${clientId}: forwarding RC event: ${type}`
            );
            sendJson(ws, { event: type, ...rest });
          });

          rcClient.on("disconnected", () => {
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

          sendJson(ws, { event: "connected", sessionId });
          console.log(
            `[ws] → Client #${clientId}: connected to ${sessionId}`
          );

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
}

// WebSocket server (HTTP)
const wss = new WebSocketServer({ server, path: "/ws" });
wss.on("connection", (ws: WebSocket) => {
  setupWebSocketClient(ws);
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
  console.log(`[server] HTTP bridge server running on http://0.0.0.0:${PORT}`);
  console.log(`[server] WebSocket endpoint: ws://0.0.0.0:${PORT}/ws`);
});

if (httpsServer) {
  // Attach a second WebSocket server to the HTTPS server
  const wssSecure = new WebSocketServer({ server: httpsServer, path: "/ws" });
  wssSecure.on("connection", (ws: WebSocket) => {
    setupWebSocketClient(ws);
  });

  httpsServer.listen(HTTPS_PORT, "0.0.0.0", () => {
    console.log(`[server] HTTPS bridge server running on https://0.0.0.0:${HTTPS_PORT}`);
    console.log(`[server] Secure WebSocket endpoint: wss://0.0.0.0:${HTTPS_PORT}/ws`);
  });
} else {
  console.log(`[server] No TLS certs found in ${certDir} — HTTPS disabled`);
  console.log(`[server] Run: sudo tailscale cert --cert-file certs/server.crt --key-file certs/server.key <hostname>.ts.net`);
}
