import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc, and, gte } from "drizzle-orm";
import { db, ordersTable } from "@workspace/db";
import { getAuth } from "../lib/bridgeAuth";
import {
  ListOrdersQueryParams,
  CreateOrderBody,
  GetOrderParams,
  AcceptOrderParams,
  AcceptOrderBody,
  RejectOrderParams,
  RejectOrderBody,
  MarkOrderReadyParams,
} from "@workspace/api-zod";
import { notifyBridgeEats } from "./restaurant";
import { addSseClient, removeSseClient } from "../lib/sseEmitter";

const router: IRouter = Router();

/* Helper: get the restaurant ID from the request (JWT userId) — returns null if not authenticated */
function getRestaurantId(req: Request): string | null {
  return getAuth(req).userId ?? null;
}

/* GET /orders/events — SSE stream for real-time order push notifications
   The browser keeps this connection open; the server sends an "new_order" event
   whenever a webhook creates an order for this restaurant.
   EventSource ne peut pas envoyer de header Authorization : le JWT est passé
   en query param (?token=...), lu par getAuth() en repli (voir bridgeAuth.ts). */
router.get("/orders/events", (req: Request, res: Response): void => {
  const restaurantId = getRestaurantId(req);
  if (!restaurantId) { res.status(401).end(); return; }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // prevent Nginx from buffering SSE
  res.flushHeaders();

  /* Tell the browser to reconnect after 500 ms if the connection drops
     (production proxy cuts connections every ~5 min — default retry is 3 s). */
  res.write("retry: 500\n\n");

  /* Keep-alive heartbeat every 20 s to prevent proxy/CDN timeouts */
  const heartbeat = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
      (res as any).flush?.();
    } catch {
      clearInterval(heartbeat);
    }
  }, 20_000);

  addSseClient(restaurantId, res);
  req.log.info({ restaurantId }, "SSE client connected");

  req.on("close", () => {
    clearInterval(heartbeat);
    removeSseClient(restaurantId, res);
    req.log.info({ restaurantId }, "SSE client disconnected");
  });
});

/* GET /orders/stats/summary */
router.get("/orders/stats/summary", async (req: Request, res: Response): Promise<void> => {
  const restaurantId = getRestaurantId(req);
  if (!restaurantId) { res.status(401).json({ error: "Non authentifié" }); return; }
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const orders = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.restaurantId, restaurantId),
        gte(ordersTable.createdAt, todayStart)
      )
    );

  const totalToday = orders.length;
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const acceptedCount = orders.filter((o) => o.status === "accepted").length;
  const readyCount = orders.filter((o) => o.status === "ready").length;
  const totalRevenue = orders
    .filter((o) => o.status !== "rejected")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const acceptedWithPrep = orders.filter(
    (o) => o.estimatedPrepTime != null && o.status !== "pending"
  );
  const avgPrepTime =
    acceptedWithPrep.length > 0
      ? acceptedWithPrep.reduce((sum, o) => sum + (o.estimatedPrepTime ?? 0), 0) /
        acceptedWithPrep.length
      : null;

  res.json({
    totalToday,
    pendingCount,
    acceptedCount,
    readyCount,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    avgPrepTime,
  });
});

/* GET /orders/stats/recent */
router.get("/orders/stats/recent", async (req: Request, res: Response): Promise<void> => {
  const restaurantId = getRestaurantId(req);
  if (!restaurantId) { res.status(401).json({ error: "Non authentifié" }); return; }

  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.restaurantId, restaurantId))
    .orderBy(desc(ordersTable.createdAt))
    .limit(20);

  res.json(orders);
});

/* GET /orders */
router.get("/orders", async (req: Request, res: Response): Promise<void> => {
  const parsed = ListOrdersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const restaurantId = getRestaurantId(req);
  if (!restaurantId) { res.status(401).json({ error: "Non authentifié" }); return; }
  const { status, limit } = parsed.data;

  const conditions = [eq(ordersTable.restaurantId, restaurantId)];
  if (status) conditions.push(eq(ordersTable.status, status));

  let query = db
    .select()
    .from(ordersTable)
    .where(and(...conditions))
    .orderBy(desc(ordersTable.createdAt))
    .$dynamic();

  if (limit) {
    query = query.limit(limit);
  }

  const orders = await query;
  res.json(orders);
});

/* POST /orders */
router.post("/orders", async (req: Request, res: Response): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const restaurantId = getRestaurantId(req);
  if (!restaurantId) { res.status(401).json({ error: "Non authentifié" }); return; }

  const [order] = await db
    .insert(ordersTable)
    .values({
      restaurantId,
      orderNumber: parsed.data.orderNumber,
      platform: parsed.data.platform,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone ?? null,
      items: parsed.data.items as any,
      totalAmount: parsed.data.totalAmount,
      estimatedPrepTime: parsed.data.estimatedPrepTime ?? null,
      deliveryAddress: parsed.data.deliveryAddress ?? null,
      deliveryPersonName: parsed.data.deliveryPersonName ?? null,
      deliveryPersonPhone: parsed.data.deliveryPersonPhone ?? null,
      notes: parsed.data.notes ?? null,
      status: "pending",
    })
    .returning();

  res.status(201).json(order);
});

/* GET /orders/:id */
router.get("/orders/:id", async (req: Request, res: Response): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const restaurantId = getRestaurantId(req);
  if (!restaurantId) { res.status(401).json({ error: "Non authentifié" }); return; }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.id, params.data.id),
        eq(ordersTable.restaurantId, restaurantId)
      )
    );

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(order);
});

/* POST /orders/:id/accept */
router.post("/orders/:id/accept", async (req: Request, res: Response): Promise<void> => {
  const params = AcceptOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = AcceptOrderBody.safeParse(req.body ?? {});
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const restaurantId = getRestaurantId(req);
  if (!restaurantId) { res.status(401).json({ error: "Non authentifié" }); return; }

  const updateData: Record<string, unknown> = {
    status: "accepted",
    acceptedAt: new Date(),
  };
  if (body.data.estimatedPrepTime != null) {
    updateData.estimatedPrepTime = body.data.estimatedPrepTime;
  }

  const [order] = await db
    .update(ordersTable)
    .set(updateData as any)
    .where(
      and(
        eq(ordersTable.id, params.data.id),
        eq(ordersTable.restaurantId, restaurantId)
      )
    )
    .returning();

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  /* Notify Bridge Eats asynchronously — do not block the response.
     On envoie "preparing" (pas "accepted") : côté Bridge-safi, "accepted" et
     "preparing" font tous les deux avancer la barre de progression, mais seul
     "preparing" affiche le texte "En préparation" au client (voir
     STATUS_LABEL dans App.tsx) — c'est précisément ce que zabi veut voir
     apparaître une fois que le resto a choisi son temps de préparation. */
  if (order.callbackUrl) {
    notifyBridgeEats(order.callbackUrl, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: "preparing",
      estimatedPrepTime: order.estimatedPrepTime,
    }).then((result) => {
      req.log.info({ orderId: order.id, callbackResult: result }, "Bridge Eats callback: preparing");
    }).catch(() => {/* swallow */});
  }

  res.json(order);
});

/* POST /orders/:id/reject */
router.post("/orders/:id/reject", async (req: Request, res: Response): Promise<void> => {
  const params = RejectOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = RejectOrderBody.safeParse(req.body ?? {});
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const restaurantId = getRestaurantId(req);
  if (!restaurantId) { res.status(401).json({ error: "Non authentifié" }); return; }

  const [order] = await db
    .update(ordersTable)
    .set({
      status: "rejected",
      rejectionReason: body.data.reason ?? null,
    })
    .where(
      and(
        eq(ordersTable.id, params.data.id),
        eq(ordersTable.restaurantId, restaurantId)
      )
    )
    .returning();

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  /* Notify Bridge Eats asynchronously */
  if (order.callbackUrl) {
    notifyBridgeEats(order.callbackUrl, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: "rejected",
      rejectionReason: order.rejectionReason,
    }).then((result) => {
      req.log.info({ orderId: order.id, callbackResult: result }, "Bridge Eats callback: rejected");
    }).catch(() => {/* swallow */});
  }

  res.json(order);
});

/* POST /orders/:id/ready */
router.post("/orders/:id/ready", async (req: Request, res: Response): Promise<void> => {
  const params = MarkOrderReadyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const restaurantId = getRestaurantId(req);
  if (!restaurantId) { res.status(401).json({ error: "Non authentifié" }); return; }

  const [order] = await db
    .update(ordersTable)
    .set({
      status: "ready",
      readyAt: new Date(),
    })
    .where(
      and(
        eq(ordersTable.id, params.data.id),
        eq(ordersTable.restaurantId, restaurantId)
      )
    )
    .returning();

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  /* Notify Bridge Eats asynchronously */
  if (order.callbackUrl) {
    notifyBridgeEats(order.callbackUrl, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: "ready",
    }).then((result) => {
      req.log.info({ orderId: order.id, callbackResult: result }, "Bridge Eats callback: ready");
    }).catch(() => {/* swallow */});
  }

  res.json(order);
});

export default router;
