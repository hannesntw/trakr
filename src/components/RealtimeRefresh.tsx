"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import type { ChangeEvent } from "@/lib/events";

/**
 * Invisible component that listens to the SSE event stream and triggers
 * router.refresh() so all server components re-render with fresh data.
 *
 * Drop this into a layout to give every child page live updates.
 * Pages that manage their own client-side data (board, backlog, sprints)
 * also keep their per-page useRealtimeRefresh hook for immediate re-fetch;
 * the two don't conflict since router.refresh() preserves client state.
 */
export function RealtimeRefresh() {
  const router = useRouter();
  const disposed = useRef(false);

  useEffect(() => {
    disposed.current = false;
    let es: EventSource | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    function connect() {
      if (disposed.current) return;
      es = new EventSource("/api/events");

      es.onmessage = () => {
        // Debounce rapid-fire events (e.g. bulk MCP imports)
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          router.refresh();
        }, 200);
      };

      es.onerror = () => {
        es?.close();
        // Reconnect after a brief delay
        if (!disposed.current) setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      disposed.current = true;
      clearTimeout(debounceTimer);
      es?.close();
    };
  }, [router]);

  return null;
}
