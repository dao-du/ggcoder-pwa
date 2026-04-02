import { glob } from "glob";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import net from "node:net";

export interface SessionInfo {
  id: string;
  pid: number;
  cwd: string;
  status: "idle" | "working" | "unknown";
}

const RC_SOCKET_DIR = path.join(os.homedir(), ".gg");
const SESSIONS_DIR = path.join(RC_SOCKET_DIR, "sessions");

export async function discoverSessions(): Promise<SessionInfo[]> {
  const pattern = path.join(RC_SOCKET_DIR, "rc-*.sock");
  console.log(`[session-mgr] Scanning: ${pattern}`);
  const socketPaths = await glob(pattern);
  console.log(`[session-mgr] Found ${socketPaths.length} socket files`);
  const sessions: SessionInfo[] = [];

  for (const socketPath of socketPaths) {
    const filename = path.basename(socketPath, ".sock");
    const pidStr = filename.replace("rc-", "");
    const pid = parseInt(pidStr, 10);
    if (isNaN(pid)) continue;

    const session = await probeSession(socketPath, pid);
    if (session) {
      sessions.push(session);
      console.log(
        `[session-mgr] ✓ ${session.id}: pid=${session.pid}, cwd=${session.cwd}`
      );
    } else {
      console.log(`[session-mgr] ✗ rc-${pid}: not reachable`);
    }
  }

  return sessions;
}

async function probeSession(
  socketPath: string,
  pid: number
): Promise<SessionInfo | null> {
  // Check if process exists
  try {
    process.kill(pid, 0);
  } catch {
    console.log(`[session-mgr] PID ${pid} not running, skipping`);
    return null;
  }

  // Try to connect briefly to verify socket is alive
  const alive = await checkSocketAlive(socketPath);
  if (!alive) return null;

  // Get cwd from /proc/<pid>/cwd
  let cwd = "unknown";
  try {
    cwd = fs.readlinkSync(`/proc/${pid}/cwd`);
  } catch {
    // Might not have permissions or not on Linux
  }

  return {
    id: `rc-${pid}`,
    pid,
    cwd,
    status: "unknown",
  };
}

function checkSocketAlive(socketPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = net.createConnection({ path: socketPath });
    const timer = setTimeout(() => {
      sock.destroy();
      resolve(false);
    }, 1500);

    sock.on("connect", () => {
      clearTimeout(timer);
      sock.destroy();
      resolve(true);
    });
    sock.on("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

export function getSocketPath(sessionId: string): string {
  return path.join(RC_SOCKET_DIR, `${sessionId}.sock`);
}

/**
 * Load conversation history from the session JSONL files.
 * Maps PID → cwd → session directory slug → latest JSONL file.
 */
export function loadSessionHistory(
  pid: number
): { role: string; content: unknown }[] {
  // Get cwd from /proc
  let cwd: string;
  try {
    cwd = fs.readlinkSync(`/proc/${pid}/cwd`);
  } catch {
    console.log(`[session-mgr] Cannot read cwd for PID ${pid}`);
    return [];
  }

  // Convert cwd to session dir slug: /tmp/ggcoder-pwa → tmp_ggcoder-pwa
  const slug = cwd.replace(/^\//, "").replace(/\//g, "_");
  const sessionDir = path.join(SESSIONS_DIR, slug);

  if (!fs.existsSync(sessionDir)) {
    console.log(`[session-mgr] Session dir not found: ${sessionDir}`);
    return [];
  }

  // Find the most recently MODIFIED JSONL file (the active session)
  const files = fs
    .readdirSync(sessionDir)
    .filter((f) => f.endsWith(".jsonl"));
  if (files.length === 0) {
    console.log(`[session-mgr] No JSONL files in ${sessionDir}`);
    return [];
  }

  // Sort by mtime descending — active session has the latest write
  files.sort((a, b) => {
    const mtimeA = fs.statSync(path.join(sessionDir, a)).mtimeMs;
    const mtimeB = fs.statSync(path.join(sessionDir, b)).mtimeMs;
    return mtimeB - mtimeA;
  });
  console.log(
    `[session-mgr] Session files (by mtime): ${files.map((f) => `${f} (${fs.statSync(path.join(sessionDir, f)).size}b)`).join(", ")}`
  );

  const latestFile = path.join(sessionDir, files[0]);
  console.log(`[session-mgr] Loading history from: ${latestFile}`);

  try {
    const content = fs.readFileSync(latestFile, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim());
    const messages: { role: string; content: unknown }[] = [];

    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        if (obj.type === "message" && obj.message) {
          messages.push({
            role: obj.message.role,
            content: obj.message.content,
          });
        }
      } catch {
        // Skip malformed lines
      }
    }

    // Cap history to last 60 messages to avoid overwhelming the browser
    const MAX_HISTORY = 60;
    const capped =
      messages.length > MAX_HISTORY
        ? messages.slice(-MAX_HISTORY)
        : messages;
    console.log(
      `[session-mgr] Loaded ${messages.length} messages, sending last ${capped.length}`
    );
    return capped;
  } catch (err) {
    console.log(`[session-mgr] Error reading history: ${err}`);
    return [];
  }
}
