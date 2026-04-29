import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { eq, desc, and, gte } from "drizzle-orm";
import { db, ordersTable } from "@workspace/db";
import { requireAuth } from "@clerk/express";
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

const router: IRouter = Router();

/* All order routes require authentication */
router.use(requireAuth());

/* Helper: get the restaurant ID from the request (Clerk userId) */
function getRestaurantId(req: Request): string {
  return req.auth.userId!;
}

/* GET /orders/stats/summary */
router.get("/orders/stats/summary", async (req: Request, res: Response): Promise<void> => {
  const restaurantId = getRestaurantId(req);
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

  res.json(order);
});

export default router;
