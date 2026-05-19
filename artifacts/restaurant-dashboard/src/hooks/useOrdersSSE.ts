import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListOrdersQueryKey,
  getGetRecentOrdersQueryKey,
  getGetOrderStatsQueryKey,
} from "@workspace/api-client-react";

/**
 * Opens a Server-Sent Events connection to /api/orders/events.
 * When the server emits a "new_order" event (triggered by an incoming webhook),
 * all order-related React Query caches are immediately invalidated so the UI
 * refreshes without waiting for the next polling cycle.
 *
 * EventSource auto-reconnects on disconnection — no manual retry needed.
 */
export function useOrdersSSE() {
  const qc = useQueryClient();

  useEffect(() => {
    const es = new EventSource("/api/orders/events");

    es.addEventListener("new_order", () => {
      qc.invalidateQueries({ queryKey: getListOrdersQueryKey() });
      qc.invalidateQueries({ queryKey: getGetRecentOrdersQueryKey() });
      qc.invalidateQueries({ queryKey: getGetOrderStatsQueryKey() });
    });

    return () => {
      es.close();
    };
  }, [qc]);
}
