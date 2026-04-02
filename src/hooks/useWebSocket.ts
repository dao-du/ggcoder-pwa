import { useEffect, useRef, useState, useCallback } from "react";
import type { ClientMessage } from "../types";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export interface DebugEvent {
  time: string;
  direction: "in" | "out";
  data: string;
}

const MAX_DEBUG_EVENTS = 100;

export function useWebSocket() {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [lastMessage, setLastMessage] = useState<unknown>(null);
  const [debugEvents, setDebugEvents] = useState<DebugEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Queue messages sent before WS is open
  const pendingRef = useRef<ClientMessage[]>([]);

  const addDebugEvent = useCallback(
    (direction: "in" | "out", data: string) => {
      const time = new Date().toLocaleTimeString("en-GB", { hour12: false });
      setDebugEvents((prev) => {
        const next = [...prev, { time, direction, data }];
        return next.length > MAX_DEBUG_EVENTS
          ? next.slice(-MAX_DEBUG_EVENTS)
          : next;
      });
    },
    []
  );

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    console.log(`[ws] Connecting to ${wsUrl}...`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    setStatus("connecting");

    ws.onopen = () => {
      console.log("[ws] Connected");
      setStatus("connected");
      retryRef.current = 0;
      addDebugEvent("out", "[WebSocket connected]");

      // Flush any pending messages
      for (const msg of pendingRef.current) {
        const json = JSON.stringify(msg);
        console.log(`[ws] Flushing pending: ${json}`);
        addDebugEvent("out", json);
        ws.send(json);
      }
      pendingRef.current = [];
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data as string);
        const event = data.event || "unknown";
        const preview =
          event === "history"
            ? `history (${data.messages?.length ?? 0} msgs)`
            : (e.data as string).slice(0, 200);
        console.log(`[ws] ← ${preview}`);
        addDebugEvent("in", preview);
        setLastMessage(data);
      } catch {
        console.log(`[ws] ← [malformed]`);
      }
    };

    ws.onclose = () => {
      console.log("[ws] Disconnected");
      setStatus("disconnected");
      wsRef.current = null;
      addDebugEvent("in", "[WebSocket disconnected]");
      const delay = Math.min(1000 * 2 ** retryRef.current, 30000);
      retryRef.current++;
      console.log(`[ws] Reconnecting in ${delay}ms...`);
      timerRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [addDebugEvent]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback(
    (msg: ClientMessage) => {
      const json = JSON.stringify(msg);
      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) {
        console.log(`[ws] → ${json}`);
        addDebugEvent("out", json);
        ws.send(json);
      } else {
        // Queue for later
        console.log(`[ws] → [queued, WS not open] ${json}`);
        addDebugEvent("out", `[queued] ${json}`);
        pendingRef.current.push(msg);
      }
    },
    [addDebugEvent]
  );

  return { status, lastMessage, send, debugEvents };
}
