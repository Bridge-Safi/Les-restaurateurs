import type { Response } from "express";
import { logger } from "./logger";

/**
 * In-process SSE bus.
 * Maps restaurantId (Clerk userId) → set of open SSE response objects.
 * When a webhook creates an order, call emitNewOrder(restaurantId) to
 * instantly notify all connected dashboard tabs for that restaurant.
 */
const clients = new Map<string, Set<Response>>();

export function addSseClient(restaurantId: string, res: Response): void {
  if (!clients.has(restaurantId)) {
    clients.set(restaurantId, new Set());
  }
  clients.get(restaurantId)!.add(res);
}

export function removeSseClient(restaurantId: string, res: Response): void {
  clients.get(restaurantId)?.delete(res);
}

export function emitNewOrder(restaurantId: string): void {
  const set = clients.get(restaurantId);
  const clientCount = set?.size ?? 0;
  logger.info({ restaurantId, clientCount }, "SSE emitNewOrder");

  if (!set || clientCount === 0) return;

  const payload = "event: new_order\ndata: {}\n\n";
  for (const res of set) {
    try {
      res.write(payload);
      /* Force the data through the proxy immediately — critical for production */
      (res as any).flush?.();
    } catch {
      set.delete(res);
    }
  }
}
