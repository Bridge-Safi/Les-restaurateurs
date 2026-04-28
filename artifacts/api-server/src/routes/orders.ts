import { Router, type IRouter } from "express";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { db, ordersTable } from "@workspace/db";
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

router.get("/orders/stats/summary", async (req, res): Promise<void> => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const orders = await db
    .select()
    .from(ordersTable)
    .where(gte(ordersTable.createdAt, todayStart));

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

router.get("/orders/stats/recent", async (req, res): Promise<void> => {
  const orders = await db
    .select()
    .from(ordersTable)
    .orderBy(desc(ordersTable.createdAt))
    .limit(20);

  res.json(orders);
});

router.get("/orders", async (req, res): Promise<void> => {
  const parsed = ListOrdersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { status, limit } = parsed.data;

  let query = db.select().from(ordersTable).$dynamic();

  if (status) {
    query = query.where(eq(ordersTable.status, status));
  }

  query = query.orderBy(desc(ordersTable.createdAt));

  if (limit) {
    query = query.limit(limit);
  }

  const orders = await query;
  res.json(orders);
});

router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [order] = await db
    .insert(ordersTable)
    .values({
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

router.get("/orders/:id", async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, params.data.id));

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(order);
});

router.post("/orders/:id/accept", async (req, res): Promise<void> => {
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
    .where(eq(ordersTable.id, params.data.id))
    .returning();

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(order);
});

router.post("/orders/:id/reject", async (req, res): Promise<void> => {
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

  const [order] = await db
    .update(ordersTable)
    .set({
      status: "rejected",
      rejectionReason: body.data.reason ?? null,
    })
    .where(eq(ordersTable.id, params.data.id))
    .returning();

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(order);
});

router.post("/orders/:id/ready", async (req, res): Promise<void> => {
  const params = MarkOrderReadyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [order] = await db
    .update(ordersTable)
    .set({
      status: "ready",
      readyAt: new Date(),
    })
    .where(eq(ordersTable.id, params.data.id))
    .returning();

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(order);
});

export default router;
