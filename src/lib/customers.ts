import "server-only";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { appUrl, sendEmail } from "./email";
import { newToken, sha256 } from "./crypto";
import { PRODUCTS, isProductKey } from "./products";
import { LIVE_STATUSES, getSubscription } from "./billing";

export const normEmail = (e: string) => e.trim().toLowerCase();

/** Record a purchase against an email. If an account exists, link it and seed its checklist. */
export async function grantProduct(email: string, productKey: string, source: "manual" | "stripe", externalRef?: string) {
  if (!isProductKey(productKey)) throw new Error(`Unknown product ${productKey}`);
  const db = await getDb();
  email = normEmail(email);
  const inserted = await db.insert(schema.purchases).values({ email, productKey, source, externalRef }).onConflictDoNothing().returning({ id: schema.purchases.id });
  const [u] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email));
  if (u) await linkPurchases(u.id, email);
  return inserted.length > 0; // false if this exact purchase was already recorded
}

export async function linkPurchases(userId: string, email: string) {
  const db = await getDb();
  await db.update(schema.purchases).set({ userId }).where(and(eq(schema.purchases.email, email), isNull(schema.purchases.userId)));
  const mine = await db.select().from(schema.purchases).where(eq(schema.purchases.userId, userId));
  for (const p of mine) {
    if (!isProductKey(p.productKey)) continue;
    const rows = PRODUCTS[p.productKey].tasks.map((t) => ({ userId, productKey: p.productKey, taskKey: t.key }));
    if (rows.length) await db.insert(schema.tasks).values(rows).onConflictDoNothing();
  }
}

export async function ensureAccount(email: string, name = "") {
  const db = await getDb();
  email = normEmail(email);
  let [u] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (!u) [u] = await db.insert(schema.users).values({ email, name }).returning();
  await linkPurchases(u.id, email);
  return u;
}

export async function hasPurchase(email: string) {
  const db = await getDb();
  const rows = await db.select({ id: schema.purchases.id }).from(schema.purchases).where(eq(schema.purchases.email, normEmail(email))).limit(1);
  return rows.length > 0;
}

/** Sends a one-time link to set a password. Used for first-time activation and for resets. */
export async function sendSetupLink(email: string, kind: "setup" | "reset") {
  const db = await getDb();
  email = normEmail(email);
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  // Only people who have bought something (or already have an account) can get a link.
  if (!existing && !(await hasPurchase(email))) return;
  const user = existing ?? (await ensureAccount(email));
  await db.delete(schema.authTokens).where(and(eq(schema.authTokens.userId, user.id), isNull(schema.authTokens.usedAt)));
  const token = newToken();
  await db.insert(schema.authTokens).values({
    userId: user.id, type: kind, tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + (kind === "setup" ? 7 * 86400_000 : 3600_000)),
  });
  const url = `${appUrl()}/set-password?token=${token}`;
  const first = user.name.split(" ")[0];
  await sendEmail(
    email,
    kind === "setup" ? "Set up your MTD Back Office account" : "Reset your MTD Back Office password",
    kind === "setup"
      ? `Hi${first ? " " + first : ""},\n\nThanks for choosing MTD Back Office. Your account is ready.\n\nChoose a password here (link works for 7 days):\n${url}\n\nOnce you're in, you'll see exactly what we need from you. Most people finish in about 20 minutes.\n\nAny questions, just reply to this email.\n\nThe MTD Back Office team`
      : `Hi${first ? " " + first : ""},\n\nUse this link to choose a new password (it works once, for one hour):\n${url}\n\nIf you didn't ask for this, you can ignore this email.\n\nThe MTD Back Office team`,
  );
}

/**
 * What a customer currently has. One-off products come from purchases. Care plans come from the live
 * subscription (so cancelling or switching in Stripe takes effect), except plans an admin granted manually.
 */
export async function userProductKeys(userId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db.select({ k: schema.purchases.productKey, src: schema.purchases.source }).from(schema.purchases).where(eq(schema.purchases.userId, userId));
  const keys = new Set(rows.filter((r) => !(r.k.startsWith("care_") && r.src === "stripe")).map((r) => r.k));
  const sub = await getSubscription(userId);
  if (sub && LIVE_STATUSES.includes(sub.status)) keys.add(sub.productKey);
  return [...keys];
}

export async function progressFor(userIds: string[]) {
  const out = new Map<string, { done: number; total: number }>();
  if (!userIds.length) return out;
  const db = await getDb();
  const rows = await db.select().from(schema.tasks).where(inArray(schema.tasks.userId, userIds));
  for (const r of rows) {
    const p = out.get(r.userId) ?? { done: 0, total: 0 };
    p.total++; if (r.status === "done") p.done++;
    out.set(r.userId, p);
  }
  return out;
}
