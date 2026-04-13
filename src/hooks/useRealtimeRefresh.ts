"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { ChangeEvent } from "@/lib/events";

const POLL_INTERVAL = 5000; // 5 seconds

/**
 * Subscribes to the SSE event stream and calls `onRefresh` whenever
 * a change event arrives. Debounces rapid-fire events (e.g. bulk MCP updates).
 *
 * Includes a polling fallback (every 5s) for cross-instance updates on
 * serverless platforms (e.g. Vercel) where SSE only works within a single
 * instance. Polling is skipped when an SSE event was received recently.
 *
 * Returns a set of recently-changed work-item IDs (for highlight animations).
 * IDs are automatically cleared after 2 seconds.
 */
export function useRealtimeRefresh(onRefresh: () => void) {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const lastSseEvent = useRef(0);
  const [changedIds, setChangedIds] = useState<Set<number>>(new Set());
  const clearTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const trackChange = useCallback((event: ChangeEvent) => {
    // For work-item events, track the item ID directly.
    // For sub-resource events (comments, attachments), track the parent work item.
    const id = event.type === "work-item" ? event.id : event.workItemId;
    if (id == null) return;

    setChangedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    // Clear the highlight after 2s
    const existing = clearTimers.current.get(id);
    if (existing) clearTimeout(existing);
    clearTimers.current.set(
      id,
      setTimeout(() => {
        setChangedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        clearTimers.current.delete(id);
      }, 2000)
    );
  }, []);

  useEffect(() => {
    let es: EventSource | null = null;
    let disposed = false;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    const pendingEvents: ChangeEvent[] = [];

    function connect() {
      if (disposed) return;
      es = new EventSource("/api/events");

      es.onmessage = (msg) => {
        lastSseEvent.current = Date.now();

        let event: ChangeEvent | undefined;
        try {
          event = JSON.parse(msg.data) as ChangeEvent;
        } catch {
          // Ignore unparseable messages
        }

        if (event) {
          pendingEvents.push(event);
          trackChange(event);
        }

        // Debounce: if multiple events fire in quick succession, only refetch once
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          pendingEvents.length = 0;
          onRefreshRef.current();
        }, 150);
      };

      es.onerror = () => {
        es?.close();
        if (!disposed) setTimeout(connect, 2000);
      };
    }

    connect();

    // Polling fallback for cross-instance updates (serverless).
    // Only polls when the tab is visible and no SSE event arrived recently.
    const pollTimer = setInterval(() => {
      if (disposed) return;
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastSseEvent.current < POLL_INTERVAL) return;
      onRefreshRef.current();
    }, POLL_INTERVAL);

    return () => {
      disposed = true;
      clearTimeout(debounceTimer);
      clearInterval(pollTimer);
      es?.close();
      // Clean up all highlight timers
      for (const timer of clearTimers.current.values()) {
        clearTimeout(timer);
      }
      clearTimers.current.clear();
    };
  }, [trackChange]);

  return changedIds;
}
