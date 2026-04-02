# GGCoder Remote Control PWA

## What This Is
A mobile-first Progressive Web App that bridges GGCoder's local RC Unix sockets to a browser-based chat UI. Allows phone-based monitoring and control of GGCoder coding agent sessions over the network (via Tailscale).

Self-hosted alternative to Claude Code's Remote Control — no subscription required.

## Architecture
```
Phone (PWA) ←→ WSS (HTTPS) ←→ Bridge Server (Node.js) ←→ Unix Socket ←→ GGCoder RC
```

- **Frontend**: React + Vite + Tailwind CSS, built as a PWA with vite-plugin-pwa
- **Bridge Server**: Express + `ws` library, serves static files + WebSocket endpoint on same port
- **RC Protocol**: NDJSON over Unix domain sockets at `~/.gg/rc-<PID>.sock`
- **HTTPS**: Tailscale-issued TLS certs in `certs/` — required for PWA install on mobile

## How to Run

```bash
# Build frontend
npx vite build

# Run production server (serves static + WebSocket bridge)
NODE_ENV=production npx tsx server/index.ts
```

- HTTP server: `http://0.0.0.0:3847` (local/dev)
- HTTPS server: `https://0.0.0.0:3848` (PWA-ready, mobile install)

Access via Tailscale: `https://dellxps.tailf4da52.ts.net:3848/`

### TLS Certificate Setup
```bash
sudo tailscale cert --cert-file certs/server.crt --key-file certs/server.key dellxps.tailf4da52.ts.net
sudo chown $USER:$USER certs/server.crt certs/server.key
```
Certs auto-renew via Tailscale. If expired, re-run the above.

## RC Socket Protocol

### Socket Location
`~/.gg/rc-<PID>.sock` — one per running GGCoder session with `--rc` flag.

### Commands (client → GGCoder, NDJSON)
Commands use `command` field (not `type`!) and require an `id` field:
```jsonl
{"id": "1", "command": "prompt", "text": "Fix the login bug"}
{"id": "2", "command": "abort"}
{"id": "3", "command": "get_state"}
```
**NOTE**: `get_state` is emitted as an event but is NOT handled in the interactive mode (App.tsx only listens for `prompt`, `connection`, `disconnection`). It silently does nothing.

### Events (GGCoder → client, NDJSON broadcast)
Events are broadcast to ALL connected socket clients:
```jsonl
{"type": "text_delta", "text": "Let me look at..."}
{"type": "thinking_delta", "text": "I should check..."}
{"type": "tool_call_start", "tool": "read", "id": "tc_1", "params": {"file_path": "src/auth.ts"}}
{"type": "tool_call_update", "id": "tc_1", "output": "...file contents..."}
{"type": "tool_call_end", "id": "tc_1"}
{"type": "turn_end"}
{"type": "agent_done"}
{"type": "result", "id": "cmd-id", "data": {"status": "done"}}
{"type": "error", "message": "..."}
```

Additional events: `server_tool_call`, `server_tool_result`, `compaction_start`, `compaction_end`, `session_start`, `model_change`, `branch_created`

### Prompt Response Flow
1. Client sends `{id, command: "prompt", text: "..."}` over Unix socket
2. GGCoder queues the prompt, processes it through the agent
3. During processing: broadcasts `text_delta`, `thinking_delta`, `tool_call_*` events
4. On completion: broadcasts `{id, type: "result", data: {status: "done"}}`

## Session History
Session history is stored as JSONL files in `~/.gg/sessions/<cwd_slug>/`. Each file starts with a `{type: "session", cwd: "...", ...}` header, followed by `{type: "message", message: {role, content}}` entries.

To map PID → session history: read `/proc/<PID>/cwd` to get the working directory, convert to slug (replace `/` with `_`, strip leading `_`), then read the latest `.jsonl` file in `~/.gg/sessions/<slug>/`.

## Key Files
- `server/index.ts` — Express + WebSocket bridge server
- `server/rc-client.ts` — Unix socket NDJSON client
- `server/session-manager.ts` — Discovers RC sockets, probes sessions, loads history
- `src/App.tsx` — Main React app with session list / chat view routing
- `src/hooks/useWebSocket.ts` — WebSocket connection with auto-reconnect + debug events
- `src/components/ChatView.tsx` — Streaming chat view with message reducer + activity tracking
- `src/components/PromptInput.tsx` — Gradient-border input with slash command autocomplete
- `src/components/SlashCommandMenu.tsx` — Floating `/command` autocomplete menu
- `src/components/ActivityIndicator.tsx` — TUI-style shimmer, spinner, phrase rotation, live stats
- `src/components/FooterBar.tsx` — Bottom status bar (cwd, model, plan/thinking modes)
- `src/components/GGLogo.tsx` — Animated gradient GG logo (header + splash variants)
- `src/components/StatusBar.tsx` — Top header bar with logo + connection status
- `src/components/DebugPanel.tsx` — Toggle-able WebSocket event inspector
- `src/components/ErrorBoundary.tsx` — Crash recovery with visible error display
- `src/types.ts` — Shared TypeScript types

## Fixes Applied
1. Changed `server.listen(PORT, ...)` → `server.listen(PORT, "0.0.0.0", ...)` for network access
2. Changed `app.get("*", ...)` → `app.get("/{*path}", ...)` for Express 5 compatibility
3. Fixed RC command format: uses `{command: "prompt", id: "..."}` not `{type: "prompt"}`
4. Session discovery uses `/proc/<PID>/cwd` instead of broken `get_state` command
5. Added conversation history loading from JSONL session files on connect
6. Added debug panel (toggle with 🐛 button) showing WebSocket events and connection state
7. Fixed race condition: old RCClient's async "disconnected" event no longer deletes new connection
8. Added `removeAllListeners()` in RCClient.disconnect() to prevent listener/memory leaks
9. Path traversal fix: sessionId validated as `rc-\d+` before constructing socket path
10. Removed StrictMode to fix double-text bug in streaming reducer
11. History capped to last 60 messages to prevent browser overload
12. Cache headers: HTML/SW get `no-cache`, hashed assets get `1h`

## Dev Commands
```bash
npm run dev      # Concurrent: bridge server + Vite dev server
npm run build    # Build frontend to dist/
npm start        # Production: serve dist/ + WebSocket bridge
bash scripts/restart.sh  # Kill old server, rebuild, start fresh
```

## Restart Script
`scripts/restart.sh` — builds frontend, kills the old server on port 3847, starts a new production server, and verifies HTTP 200. Use this after any code change.

## Auto-Launch
The `gg` command (`~/bin/gg`) wraps `ggcoder --rc` and auto-starts the PWA bridge server if it's not already running. Usage: `gg` (or `gg --resume`, `gg "prompt"`, etc — all args are forwarded).

## Environment

- Working directory: ~/projects/ggcoder-pwa
- Platform: linux
