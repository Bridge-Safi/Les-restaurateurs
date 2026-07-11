/**
 * auth.ts — Routes d'authentification restaurant-dashboard
 * DESTINATION : artifacts/api-server/src/routes/auth.ts
 *
 * Remplace Clerk : JWT maison + SHA-256, même principe que Bridge Eats.
 * Un restaurant = un compte (email + mot de passe), stocké directement dans
 * la table `restaurants` existante (colonne clerk_user_id réutilisée comme
 * identifiant unique — pas de migration de schéma nécessaire, colonnes
 * email/password_hash/salt ajoutées via ALTER TABLE IF NOT EXISTS ci-dessous).
 *
 * Routes:
 *   POST /api/auth/register — créer un compte restaurant
 *   POST /api/auth/login    — se connecter
 *   GET  /api/auth/me       — profil connecté
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { createHash, randomUUID } from "crypto";
import { pool } from "@workspace/db";
import { signJWT, getAuth } from "../lib/bridgeAuth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function hashPassword(password: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${password}:bridge_safi_restaurant_2026`).digest("hex");
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

/* Bootstrap défensif : crée les tables restaurants/orders si elles n'existent
   pas encore (la base de données de ce service n'avait jamais été migrée —
   root cause du crash "relation restaurants does not exist"), puis ajoute les
   colonnes d'authentification. Idempotent, sans dépendance à drizzle-kit. */
async function ensureSchema() {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS restaurants (
      id SERIAL PRIMARY KEY,
      clerk_user_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT 'Mon Restaurant',
      api_token TEXT NOT NULL DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
    ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS password_hash TEXT;
    ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS salt TEXT;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      restaurant_id TEXT,
      order_number TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      platform TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      items JSONB NOT NULL,
      total_amount REAL NOT NULL,
      estimated_prep_time INTEGER,
      delivery_address TEXT,
      delivery_person_name TEXT,
      delivery_person_phone TEXT,
      notes TEXT,
      rejection_reason TEXT,
      callback_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      accepted_at TIMESTAMPTZ,
      ready_at TIMESTAMPTZ
    );
  `);
}
ensureSchema().catch((err) => logger.error({ err }, "Failed to bootstrap restaurants/orders schema"));

function shapeUser(row: any) {
  return {
    id: row.clerk_user_id,
    email: row.email || null,
    phone: null,
    name: row.name || "",
    role: "restaurant",
    imageUrl: "",
  };
}

router.post("/auth/register", async (req: Request, res: Response): Promise<void> => {
  const { email, password, name } = req.body as { email?: string; password?: string; name?: string };
  if (!email || !isEmail(email)) { res.status(400).json({ error: "Adresse email invalide" }); return; }
  if (!password || password.length < 8) { res.status(400).json({ error: "Mot de passe trop faible (8 caractères min.)" }); return; }
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = (name || "").trim() || "Mon Restaurant";
  try {
    const existing = await pool.query(`SELECT id FROM restaurants WHERE email = $1`, [cleanEmail]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: "Cette adresse email est déjà utilisée. Connectez-vous." });
      return;
    }
    const clerkUserId = "rst_" + randomUUID().replace(/-/g, "").slice(0, 16);
    const salt = randomUUID();
    const hash = hashPassword(password, salt);
    const result = await pool.query(
      `INSERT INTO restaurants (clerk_user_id, name, email, password_hash, salt)
       VALUES ($1,$2,$3,$4,$5) RETURNING clerk_user_id, name, email`,
      [clerkUserId, cleanName, cleanEmail, hash, salt],
    );
    const row = result.rows[0];
    const token = signJWT({ sub: clerkUserId, role: "restaurant" });
    logger.info({ clerkUserId }, "New restaurant registered");
    res.status(201).json({ token, user: shapeUser(row) });
  } catch (err) {
    logger.error({ err }, "Register error");
    res.status(500).json({ error: "Erreur serveur. Réessayez." });
  }
});

router.post("/auth/login", async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email) { res.status(400).json({ error: "Email requis" }); return; }
  if (!password) { res.status(400).json({ error: "Mot de passe requis" }); return; }
  const cleanEmail = email.trim().toLowerCase();
  try {
    const result = await pool.query(
      `SELECT clerk_user_id, name, email, password_hash, salt FROM restaurants WHERE email = $1`,
      [cleanEmail],
    );
    if (result.rows.length === 0) {
      res.status(401).json({ error: "Compte introuvable. Vérifiez votre adresse email." });
      return;
    }
    const row = result.rows[0];
    if (!row.password_hash || hashPassword(password, row.salt) !== row.password_hash) {
      res.status(401).json({ error: "Mot de passe incorrect." });
      return;
    }
    const token = signJWT({ sub: row.clerk_user_id, role: "restaurant" });
    logger.info({ clerkUserId: row.clerk_user_id }, "Restaurant logged in");
    res.json({ token, user: shapeUser(row) });
  } catch (err) {
    logger.error({ err }, "Login error");
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.get("/auth/me", async (req: Request, res: Response): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Non authentifié" }); return; }
  try {
    const result = await pool.query(
      `SELECT clerk_user_id, name, email FROM restaurants WHERE clerk_user_id = $1`,
      [userId],
    );
    if (result.rows.length === 0) { res.status(401).json({ error: "Compte introuvable" }); return; }
    res.json(shapeUser(result.rows[0]));
  } catch (err) {
    logger.error({ err }, "/auth/me error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
