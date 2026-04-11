"use client";

import { useEffect, useRef } from "react";

/**
 * Subscribes to the SSE event stream and calls `onRefresh` whenever
 * a change event arrives. Debounces rapid-fire events (e.g. bulk MCP updates).
 */
export function useRealtimeRefresh(onRefresh: () => void) {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    let es: EventSource | null = null;
    let disposed = false;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    function connect() {
      if (disposed) return;
      es = new EventSource("/api/events");

      es.onmessage = () => {
        // Debounce: if multiple events fire in quick succession, only refetch once
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          onRefreshRef.current();
        }, 150);
      };

      es.onerror = () => {
        es?.close();
        if (!disposed) setTimeout(connect, 2000);
      };
    }

    connect();
    return () => {
      disposed = true;
      clearTimeout(debounceTimer);
      es?.close();
    };
  }, []);
}
