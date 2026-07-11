/**
 * bridgeAuth.ts — Remplace @clerk/express — zéro dépendance externe
 * DESTINATION : artifacts/api-server/src/lib/bridgeAuth.ts
 *
 * JWT maison (HMAC-SHA256), même principe que Bridge Eats.
 * getAuth(req) est un remplacement direct de @clerk/express : getAuth(req).userId
 *
 * EventSource (SSE, voir routes/orders.ts /orders/events) ne peut pas envoyer
 * de header Authorization, donc getAuth() accepte aussi le token en query
 * param (?token=...) en repli.
 */

import { createHmac } from "crypto";
import type { Request } from "express";

function b64url(s: string): string {
  return Buffer.from(s).toString("base64url");
}

const JWT_SECRET = () => process.env.SESSION_SECRET || "bridge-safi-restaurant-jwt-secret-change-me";

export function signJWT(payload: Record<string, unknown>, expiresInDays = 30): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const claims = b64url(JSON.stringify({ ...payload, iat: now, exp: now + expiresInDays * 86400 }));
  const sig = createHmac("sha256", JWT_SECRET()).update(`${header}.${claims}`).digest("base64url");
  return `${header}.${claims}.${sig}`;
}

export function verifyJWT(token: string): Record<string, any> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, claims, sig] = parts;
  const expected = createHmac("sha256", JWT_SECRET()).update(`${header}.${claims}`).digest("base64url");
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(claims, "base64url").toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

/** Remplacement direct de getAuth() de @clerk/express */
export function getAuth(req: Request): { userId: string | null } {
  let token: string | null = null;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else if (typeof req.query?.token === "string") {
    token = req.query.token;
  }
  if (!token) return { userId: null };
  const payload = verifyJWT(token);
  return { userId: payload?.sub ?? null };
}
