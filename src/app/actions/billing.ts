"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { logAudit, requireUser } from "@/lib/auth";
import { CARE_ORDER, LIVE_STATUSES, getSubscription, syncSubscription } from "@/lib/billing";
import { appUrl } from "@/lib/email";
import type { FormState } from "@/lib/form";
import { PRODUCTS, isProductKey } from "@/lib/products";
import { ensurePrice, stripe, StripeError } from "@/lib/stripe";

async function mySub() {
  const user = await requireUser();
  const sub = await getSubscription(user.id); // always the signed-in customer's own subscription
  return { user, sub: sub && LIVE_STATUSES.includes(sub.status) ? sub : null };
}
const msg = (e: unknown) => (e instanceof StripeError ? e.message : "Something went wrong. Please try again or message support.");

/** Switch between care plans. Stripe charges or credits the difference for the rest of this billing period. */
export async function changePlan(newKey: string, _: FormState, __: FormData): Promise<FormState> {
  const { user, sub } = await mySub();
  if (!sub) return { error: "You don't have an active care plan to change." };
  if (!isProductKey(newKey) || !CARE_ORDER.includes(newKey)) return { error: "Choose one of the care plans." };
  if (newKey === sub.productKey) return { error: "You're already on that plan." };
  try {
    const current = await stripe<any>("GET", `/subscriptions/${sub.stripeSubscriptionId}`);
    const updated = await stripe<any>("POST", `/subscriptions/${sub.stripeSubscriptionId}`, {
      items: [{ id: current.items.data[0].id, price: await ensurePrice(newKey) }],
      proration_behavior: "create_prorations",
      cancel_at_period_end: "false",
      metadata: { product_key: newKey },
    });
    await syncSubscription(updated, newKey);
    await logAudit(user.id, user.id, `care.change:${sub.productKey}->${newKey}`);
  } catch (e) { console.error("changePlan", e); return { error: msg(e) }; }
  // Confirm via a banner on the page: the button that was clicked disappears once the plan changes.
  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/care?msg=changed&plan=${newKey}`);
}

/** "Remove" a care plan: it stops renewing, and stays active until the end of the period already paid for. */
async function setCancel(flag: boolean): Promise<FormState> {
  const { user, sub } = await mySub();
  if (!sub) return { error: "You don't have an active care plan." };
  try {
    const updated = await stripe<any>("POST", `/subscriptions/${sub.stripeSubscriptionId}`, { cancel_at_period_end: flag ? "true" : "false" });
    await syncSubscription(updated, sub.productKey);
    await logAudit(user.id, user.id, flag ? "care.cancel_at_period_end" : "care.resume");
  } catch (e) { console.error("setCancel", e); return { error: msg(e) }; }
  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/care?msg=${flag ? "ending" : "resumed"}`);
}
export async function cancelPlan(_: FormState, __: FormData): Promise<FormState> { return setCancel(true); }
export async function resumePlan(_: FormState, __: FormData): Promise<FormState> { return setCancel(false); }

/** Stripe's hosted page: update card, see invoices and receipts. */
export async function openPortal(_: FormState, __: FormData): Promise<FormState> {
  const user = await requireUser();
  const db = await getDb();
  const [u] = await db.select({ c: schema.users.stripeCustomerId }).from(schema.users).where(eq(schema.users.id, user.id));
  if (!u?.c) return { error: "There's no payment history on your account yet." };
  let url: string | undefined;
  try {
    url = (await stripe<{ url: string }>("POST", "/billing_portal/sessions", { customer: u.c, return_url: `${appUrl()}/dashboard/care` })).url;
  } catch (e) { console.error("portal", e); return { error: "We couldn't open the billing page just now. Message support and we'll sort it." }; }
  redirect(url);
}
