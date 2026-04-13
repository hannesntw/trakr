"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import type { ChangeEvent } from "@/lib/events";

const POLL_INTERVAL = 5000; // 5 seconds

/**
 * Invisible component that listens to the SSE event stream and triggers
 * router.refresh() so all server components re-render with fresh data.
 *
 * Drop this into a layout to give every child page live updates.
 * Pages that manage their own client-side data (board, backlog, sprints)
 * also keep their per-page useRealtimeRefresh hook for immediate re-fetch;
 * the two don't conflict since router.refresh() preserves client state.
 *
 * Includes a polling fallback (every 5s) for cross-instance updates on
 * serverless platforms (e.g. Vercel) where SSE only works within a single
 * instance. Polling is skipped when an SSE event was received recently.
 */
export function RealtimeRefresh() {
  const router = useRouter();
  const disposed = useRef(false);
  const lastSseEvent = useRef(0);

  useEffect(() => {
    disposed.current = false;
    let es: EventSource | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    function connect() {
      if (disposed.current) return;
      es = new EventSource("/api/events");

      es.onmessage = () => {
        lastSseEvent.current = Date.now();
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

    // Polling fallback for cross-instance updates (serverless).
    // Only polls when the tab is visible and no SSE event arrived recently.
    const pollTimer = setInterval(() => {
      if (disposed.current) return;
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastSseEvent.current < POLL_INTERVAL) return;
      router.refresh();
    }, POLL_INTERVAL);

    return () => {
      disposed.current = true;
      clearTimeout(debounceTimer);
      clearInterval(pollTimer);
      es?.close();
    };
  }, [router]);

  return null;
}
