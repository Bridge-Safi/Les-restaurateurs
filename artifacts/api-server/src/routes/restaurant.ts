import { Router, type IRouter, type Request, type Response } from "express";
import { eq, sql, and } from "drizzle-orm";
import { db, restaurantsTable, ordersTable } from "@workspace/db";
import { getAuth } from "../lib/bridgeAuth";
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
    // Répare les callbackUrl enregistrés avec le domaine apex : safi-bridge.ma
    // sans www n'existe pas en DNS (NXDOMAIN) -> le fetch échouait direct et
    // le client Bridge Eats ne voyait jamais "En préparation". Les anciennes
    // commandes en base gardent la mauvaise URL, donc on corrige ici.
    const fixedUrl = callbackUrl.replace(/^https?:\/\/safi-bridge\.ma\//, "https://www.safi-bridge.ma/");
    const res = await fetch(fixedUrl, {
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
   LOOKUP INTERNE — appelé par Bridge-safi (api-server) pour retrouver
   automatiquement le token webhook d'un restaurant par son nom, sans
   qu'aucune configuration manuelle ne soit nécessaire à chaque nouvel
   inscrit. Protégé par un secret partagé (pas d'auth JWT restaurant).
   GET /api/restaurant/lookup?name=Sushi%20Safi
   Header: X-Internal-Secret: <secret>
═══════════════════════════════════════════════════════════════ */
const INTERNAL_LOOKUP_SECRET =
  process.env.INTERNAL_LOOKUP_SECRET || "bridge-safi-internal-lookup-2026";

/* GET /api/restaurant/all — liste complete des commerces inscrits.
   Header: X-Internal-Secret. Utilise par Manager pour afficher les
   restaurants inscrits sur ce dashboard (bases separees). */
router.get("/restaurant/all", async (req: Request, res: Response): Promise<void> => {
  const secret = req.headers["x-internal-secret"];
  if (secret !== INTERNAL_LOOKUP_SECRET) {
    res.status(401).json({ error: "Non autorisé" });
    return;
  }
  const rows = await db.select().from(restaurantsTable);
  res.json(rows.map((r) => ({
    name: r.name,
    email: (r as { email?: string | null }).email ?? null,
    serviceType: (r as { serviceType?: string | null }).serviceType ?? "restaurant",
    createdAt: r.createdAt ? new Date(r.createdAt as unknown as string | Date).toISOString() : null,
  })));
});

router.get("/restaurant/lookup", async (req: Request, res: Response): Promise<void> => {
  const secret = req.headers["x-internal-secret"];
  if (secret !== INTERNAL_LOOKUP_SECRET) {
    res.status(401).json({ error: "Non autorisé" });
    return;
  }

  const name = (req.query.name as string || "").trim();
  if (!name) {
    res.status(400).json({ error: "name requis" });
    return;
  }

  const rows = await db
    .select()
    .from(restaurantsTable)
    .where(sql`lower(${restaurantsTable.name}) = lower(${name})`)
    .limit(1);

  if (rows.length === 0) {
    res.json({ found: false });
    return;
  }

  res.json({ found: true, name: rows[0].name, apiToken: rows[0].apiToken });
});

/* ═══════════════════════════════════════════════════════════════
   PUBLIC WEBHOOK — appelé par Bridge Eats (pas d'auth JWT)
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

/* ═══════════════════════════════════════════════════════════════
   PUBLIC WEBHOOK — appelé par Bridge Eats quand le CLIENT annule
   POST /api/webhook/orders/:orderNumber/cancel
   Header: X-Bridge-Token: <apiToken>
   Sans cette route, une commande annulée côté client restait "en cuisine"
   ou "prête" sur le dashboard restaurateur pour toujours — zabi: "quand le
   client annule la livraison sa doit etre annulez meme dans restaurant".
═══════════════════════════════════════════════════════════════ */
router.post("/webhook/orders/:orderNumber/cancel", async (req: Request, res: Response): Promise<void> => {
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

  const orderNumber = String(req.params.orderNumber);
  const [order] = await db
    .update(ordersTable)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(ordersTable.orderNumber, orderNumber),
        eq(ordersTable.restaurantId, restaurant.clerkUserId)
      )
    )
    .returning();

  if (!order) {
    // Pas grave si la commande n'existe pas encore côté resto (ex: annulée
    // avant même que le webhook de création soit arrivé) — best-effort.
    res.json({ ok: true, found: false });
    return;
  }

  req.log.info({ orderId: order.id, restaurantId: restaurant.id, orderNumber }, "Order cancelled via client webhook");

  /* Push real-time notification to all connected dashboard tabs for this restaurant */
  const { emitNewOrder } = await import("../lib/sseEmitter");
  emitNewOrder(restaurant.clerkUserId);

  res.json({ ok: true, found: true, orderNumber: order.orderNumber, status: "cancelled" });
});

/* ═══════════════════════════════════════════════════════════════
   POST /api/webhook/orders/:orderNumber/picked-up
   Header: X-Bridge-Token: <apiToken>
   Appele par Bridge-safi quand le livreur recupere la commande ->
   coche verte "Récupérée" sur la carte dans la colonne "Prêtes".
═══════════════════════════════════════════════════════════════ */
router.post("/webhook/orders/:orderNumber/picked-up", async (req: Request, res: Response): Promise<void> => {
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

  const orderNumber = String(req.params.orderNumber);
  const [order] = await db
    .update(ordersTable)
    .set({ pickedUpAt: new Date() })
    .where(
      and(
        eq(ordersTable.orderNumber, orderNumber),
        eq(ordersTable.restaurantId, restaurant.clerkUserId)
      )
    )
    .returning();

  if (!order) {
    res.json({ ok: true, found: false });
    return;
  }

  req.log.info({ orderId: order.id, restaurantId: restaurant.id, orderNumber }, "Order picked up by driver (webhook)");

  const { emitNewOrder } = await import("../lib/sseEmitter");
  emitNewOrder(restaurant.clerkUserId);

  res.json({ ok: true, found: true, orderNumber: order.orderNumber });
});

export default router;
