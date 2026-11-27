import "server-only";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { isProductKey, type ProductKey } from "./products";

export const CARE_ORDER: ProductKey[] = ["care_99", "care_299", "care_599"];
export const LIVE_STATUSES = ["active", "trialing", "past_due"]; // past_due keeps access while Stripe retries the card

export type Sub = typeof schema.subscriptions.$inferSelect;

export async function getSubscription(userId: string): Promise<Sub | null> {
  const db = await getDb();
  const [u] = await db.select({ c: schema.users.stripeCustomerId }).from(schema.users).where(eq(schema.users.id, userId));
  if (!u?.c) return null;
  const rows = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.stripeCustomerId, u.c)).orderBy(desc(schema.subscriptions.updatedAt));
  return rows.find((r) => LIVE_STATUSES.includes(r.status)) ?? rows[0] ?? null;
}

/** Upsert our copy of a Stripe subscription object (from a webhook, or an API response after a change). */
export async function syncSubscription(sub: any, fallbackKey?: string) {
  const item = sub.items?.data?.[0];
  const key = item?.price?.lookup_key ?? sub.metadata?.product_key ?? fallbackKey;
  if (!sub.id || !sub.customer || !key || !isProductKey(key)) return;
  const end = item?.current_period_end ?? sub.current_period_end; // moved onto the item in newer Stripe API versions
  const values = {
    stripeCustomerId: String(typeof sub.customer === "string" ? sub.customer : sub.customer.id),
    productKey: key,
    status: String(sub.status),
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end || sub.cancel_at),
    currentPeriodEnd: end ? new Date(end * 1000) : null,
    updatedAt: new Date(),
  };
  const db = await getDb();
  await db.insert(schema.subscriptions).values({ stripeSubscriptionId: sub.id, ...values })
    .onConflictDoUpdate({ target: schema.subscriptions.stripeSubscriptionId, set: values });
}

export async function setStripeCustomer(userId: string, customerId: string) {
  const db = await getDb();
  await db.update(schema.users).set({ stripeCustomerId: customerId }).where(eq(schema.users.id, userId));
}
