import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListOrdersQueryKey,
  getGetRecentOrdersQueryKey,
  getGetOrderStatsQueryKey,
} from "@workspace/api-client-react";

/**
 * Real-time order updates via Server-Sent Events.
 *
 * Strategy (layered for maximum reliability):
 *
 * 1. SSE — the server pushes a "new_order" event the instant a webhook fires.
 *    The browser immediately invalidates all order caches → instant display.
 *
 * 2. Manual reconnection — we track the SSE connection ourselves and reconnect
 *    with a 500 ms delay when it closes (the production proxy cuts connections
 *    every ~5 min). This keeps the gap down to under a second instead of the
 *    browser's default 3-second retry.
 *
 * 3. visibilitychange — when the user returns to the app after it was
 *    backgrounded (iOS suspends JS entirely when the phone switches apps),
 *    we immediately refetch all orders. This is the safety net for mobile.
 */
export function useOrdersSSE() {
  const qc = useQueryClient();
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: getListOrdersQueryKey() });
    qc.invalidateQueries({ queryKey: getGetRecentOrdersQueryKey() });
    qc.invalidateQueries({ queryKey: getGetOrderStatsQueryKey() });
  };

  const connect = () => {
    if (unmountedRef.current) return;

    const es = new EventSource("/api/orders/events");
    esRef.current = es;

    es.addEventListener("new_order", () => {
      invalidateAll();
    });

    /* On any error or close, schedule an immediate reconnect (500 ms).
       EventSource.onerror fires for both network errors and server-closed connections. */
    es.onerror = () => {
      es.close();
      esRef.current = null;
      if (!unmountedRef.current) {
        reconnectTimer.current = setTimeout(connect, 500);
      }
    };
  };

  useEffect(() => {
    unmountedRef.current = false;
    connect();

    /* When the user returns to the app (from background, lock screen, another app),
       immediately refetch — this is the primary safety net for iOS where JS is
       fully suspended in the background. */
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        invalidateAll();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      unmountedRef.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      esRef.current?.close();
      esRef.current = null;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
