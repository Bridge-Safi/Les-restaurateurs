import { Router, type IRouter, type Request, type Response } from "express";
import { eq, sql } from "drizzle-orm";
import { db, restaurantsTable, ordersTable } from "@workspace/db";
import { getAuth } from "@clerk/express";
import { z } from "zod";

const router: IRouter = Router();

/* ── Helper: get or create the restaurant for the authenticated user ── */
async function getOrCreateRestaurant(clerkUserId: string) {
  const existing = await db
    .select()
    .from(restaurantsTable)
    .where(eq(restaurantsTable.clerkUserId, clerkUserId))
    .limit(1);

  if (existing[0]) return existing[0];

  const [created] = await db
    .insert(restaurantsTable)
    .values({ clerkUserId })
    .returning();

  return created;
}

/* ── Helper: fire-and-forget callback to Bridge Eats ── */
export async function notifyBridgeEats(
  callbackUrl: string,
  payload: {
    orderId: number;
    orderNumber: string;
    status: "accepted" | "ready" | "rejected";
    estimatedPrepTime?: number | null;
    rejectionReason?: string | null;
  }
) {
  try {
    const res = await fetch(callbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, status: res.status, body: text };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/* ── GET /api/restaurant/me — auto-creates profile on first visit ── */
router.get("/restaurant/me", async (req: Request, res: Response): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Non authentifié" }); return; }
  const restaurant = await getOrCreateRestaurant(userId);
  res.json(restaurant);
});

/* ── PATCH /api/restaurant/me — update name ── */
router.patch("/restaurant/me", async (req: Request, res: Response): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Non authentifié" }); return; }

  const parsed = z.object({ name: z.string().min(1).max(100) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Nom invalide" });
    return;
  }

  const [updated] = await db
    .update(restaurantsTable)
    .set({ name: parsed.data.name })
    .where(eq(restaurantsTable.clerkUserId, userId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Restaurant introuvable" });
    return;
  }

  res.json(updated);
});

/* ── POST /api/restaurant/me/regenerate-token ── */
router.post(
  "/restaurant/me/regenerate-token",
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Non authentifié" }); return; }

    const [updated] = await db
      .update(restaurantsTable)
      .set({ apiToken: sql`gen_random_uuid()` })
      .where(eq(restaurantsTable.clerkUserId, userId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Restaurant introuvable" });
      return;
    }

    res.json(updated);
  }
);

/* ═══════════════════════════════════════════════════════════════
   PUBLIC WEBHOOK — called by Bridge Eats (no Clerk auth)
   POST /api/webhook/orders
   Header: X-Bridge-Token: <apiToken>
   Body: same as CreateOrderBody + optional callbackUrl
═══════════════════════════════════════════════════════════════ */

const WebhookOrderBody = z.object({
  orderNumber: z.string(),
  customerName: z.string(),
  customerPhone: z.string().optional(),
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().int().positive(),
      price: z.number().nonnegative(),
      notes: z.string().optional().nullable(),
    })
  ),
  totalAmount: z.number().nonnegative(),
  estimatedPrepTime: z.number().int().positive().optional(),
  deliveryAddress: z.string().optional(),
  deliveryPersonName: z.string().optional(),
  deliveryPersonPhone: z.string().optional(),
  notes: z.string().optional(),
  /* Bridge Eats provides this URL to receive status callbacks */
  callbackUrl: z.string().url().optional(),
});

router.post("/webhook/orders", async (req: Request, res: Response): Promise<void> => {
  const token = req.headers["x-bridge-token"];
  if (!token || typeof token !== "string") {
    res.status(401).json({ error: "Token manquant (header X-Bridge-Token requis)" });
    return;
  }

  const [restaurant] = await db
    .select()
    .from(restaurantsTable)
    .where(eq(restaurantsTable.apiToken, token))
    .limit(1);

  if (!restaurant) {
    res.status(401).json({ error: "Token invalide" });
    return;
  }

  const parsed = WebhookOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const d = parsed.data;
  const [order] = await db
    .insert(ordersTable)
    .values({
      restaurantId: restaurant.clerkUserId,
      orderNumber: d.orderNumber,
      platform: "Bridge Eats",
      customerName: d.customerName,
      customerPhone: d.customerPhone ?? null,
      items: d.items as any,
      totalAmount: d.totalAmount,
      estimatedPrepTime: d.estimatedPrepTime ?? null,
      deliveryAddress: d.deliveryAddress ?? null,
      deliveryPersonName: d.deliveryPersonName ?? null,
      deliveryPersonPhone: d.deliveryPersonPhone ?? null,
      notes: d.notes ?? null,
      callbackUrl: d.callbackUrl ?? null,
      status: "pending",
    })
    .returning();

  req.log.info({ orderId: order.id, restaurantId: restaurant.id, callbackUrl: d.callbackUrl }, "Webhook order received");

  /* Push real-time notification to all connected dashboard tabs for this restaurant */
  const { emitNewOrder } = await import("../lib/sseEmitter");
  emitNewOrder(restaurant.clerkUserId);

  res.status(201).json({ orderId: order.id, orderNumber: order.orderNumber, status: "received" });
});

export default router;
