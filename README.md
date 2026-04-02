# GGCoder Remote Control PWA

A mobile-first Progressive Web App for monitoring and controlling [GGCoder](https://github.com/kenkaiiii/ggcoder) coding agent sessions from your phone — over the network via Tailscale.

Self-hosted alternative to Claude Code's Remote Control. No subscription required.

<p align="center">
<strong>
Phone → WebSocket → Bridge Server → Unix Socket → GGCoder
</strong>
</p>

## Features

- **📱 Mobile-first chat UI** — dark theme, streaming messages, collapsible tool calls
- **⚡ Real-time streaming** — text, thinking, and tool calls stream in live as the agent works
- **📜 Conversation history** — loads existing session context from JSONL files on connect
- **🎨 TUI-faithful activity indicator** — shimmer animation, contextual phrases ("Cogitating", "Surgifying", "Incantating"), color pulse, live stats (elapsed time, tokens, thinking duration)
- **✨ Animated GG logo** — blue→violet gradient flow matching the terminal aesthetic
- **💬 Slash commands** — type `/` for autocomplete menu (`/plan`, `/compact`, `/model`, `/scan`, etc.)
- **📊 Status footer** — working directory, model name, plan/thinking mode indicators
- **✳ Completion summaries** — "Completed in 2m 15s (↓ 1.2k tokens, 8 turns)"
- **🐛 Debug panel** — toggle to see all WebSocket events flowing through
- **🔄 Auto-reconnect** — exponential backoff, queued messages, resilient to network drops
- **📲 Installable PWA** — service worker, offline shell, standalone display mode

## Quick Start

```bash
# Install dependencies
npm install

# Build the frontend
npm run build

# Start the production server (serves PWA + WebSocket bridge on port 3847)
npm start
```

The server binds to `0.0.0.0:3847`. Access it from your phone via your machine's Tailscale IP:

```
http://<tailscale-ip>:3847/
```

### Prerequisites

- A running GGCoder session with the `--rc` flag enabled
- Node.js 18+
- Both devices on the same Tailscale network (or local network)

## Architecture

```
┌──────────┐    WebSocket     ┌─────────────────┐    Unix Socket    ┌──────────────┐
│  Phone   │ ◄──────────────► │  Bridge Server   │ ◄──────────────► │  GGCoder RC  │
│ (PWA)    │   JSON messages  │  (Node.js + ws)  │   NDJSON lines   │  (~/.gg/rc-  │
│          │                  │  :3847            │                  │   PID.sock)  │
└──────────┘                  └─────────────────┘                  └──────────────┘
```

**Bridge Server** (`server/`) — Express + `ws` on a single port. Discovers active RC sockets, proxies NDJSON events to/from connected browser clients, loads conversation history from session files.

**Frontend** (`src/`) — React + Vite + Tailwind CSS. Connects via WebSocket, renders streaming chat with a useReducer-based message accumulator.

## Development

```bash
# Run bridge server + Vite dev server concurrently
npm run dev

# Rebuild and restart production server
bash scripts/restart.sh

# Type-check without emitting
npx tsc --noEmit
```

## Project Structure

```
├── server/
│   ├── index.ts              # Express + WebSocket bridge server
│   ├── rc-client.ts          # Unix socket NDJSON client
│   └── session-manager.ts    # RC socket discovery + history loading
├── src/
│   ├── main.tsx              # React entry + error boundary
│   ├── App.tsx               # Router (session list ↔ chat view)
│   ├── types.ts              # Shared TypeScript types
│   ├── hooks/
│   │   ├── useWebSocket.ts   # WebSocket with auto-reconnect + debug events
│   │   └── useAutoScroll.ts  # Stick-to-bottom scroll behavior
│   ├── components/
│   │   ├── ChatView.tsx      # Streaming chat + message reducer + activity tracking
│   │   ├── SessionList.tsx   # Active session discovery with GG splash logo
│   │   ├── MessageBubble.tsx # User/assistant message rendering
│   │   ├── ToolCallBlock.tsx # Collapsible tool call display
│   │   ├── ThinkingIndicator.tsx  # Expandable thinking block
│   │   ├── ActivityIndicator.tsx  # TUI-style shimmer + spinner + stats
│   │   ├── PromptInput.tsx   # Gradient-border input + slash command menu
│   │   ├── SlashCommandMenu.tsx   # Floating autocomplete for /commands
│   │   ├── StatusBar.tsx     # Header with GG logo + connection status
│   │   ├── FooterBar.tsx     # TUI-style bottom status (cwd, model, modes)
│   │   ├── GGLogo.tsx        # Animated gradient GG logo (header + splash)
│   │   ├── DebugPanel.tsx    # WebSocket event inspector
│   │   └── ErrorBoundary.tsx # Crash recovery with error display
│   └── styles/
│       └── globals.css       # Tailwind + dark theme CSS variables
├── scripts/
│   └── restart.sh            # Build + kill old server + start fresh
├── vite.config.ts            # Vite + React + Tailwind + PWA plugins
└── tsconfig.json
```

## RC Socket Protocol

GGCoder sessions with `--rc` create Unix sockets at `~/.gg/rc-<PID>.sock`.

### Commands (PWA → GGCoder)

```jsonl
{"id": "1", "command": "prompt", "text": "Fix the login bug"}
{"id": "2", "command": "abort"}
```

### Events (GGCoder → PWA)

```jsonl
{"type": "text_delta", "text": "Let me look at..."}
{"type": "thinking_delta", "text": "I should check..."}
{"type": "tool_call_start", "tool": "read", "id": "tc_1", "params": {...}}
{"type": "tool_call_update", "id": "tc_1", "output": "file contents..."}
{"type": "tool_call_end", "id": "tc_1"}
{"type": "turn_end"}
{"type": "agent_done"}
{"type": "result", "id": "1", "data": {"status": "done"}}
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, Tailwind CSS 4, vite-plugin-pwa |
| Server | Express 5, ws, Node.js |
| Protocol | NDJSON over Unix domain sockets + WebSocket |
| Dev | TypeScript 6, tsx, concurrently |

## License

ISC
