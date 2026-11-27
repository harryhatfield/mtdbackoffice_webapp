import { createHmac, timingSafeEqual } from "node:crypto";
import { ensureAccount, grantProduct, sendSetupLink } from "@/lib/customers";
import { sendEmail, appUrl } from "@/lib/email";
import { PRODUCTS, isProductKey } from "@/lib/products";
import { setStripeCustomer, syncSubscription } from "@/lib/billing";
import { stripe } from "@/lib/stripe";

/**
 * Stripe → record the purchase and email the customer.
 * Stripe dashboard → Developers → Webhooks → add endpoint <APP_URL>/api/stripe/webhook, events:
 *   checkout.session.completed, checkout.session.async_payment_succeeded,
 *   customer.subscription.updated, customer.subscription.deleted
 * The session carries metadata.product_key (setup | sprint | care_99 | care_299 | care_599),
 * set by /api/checkout.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Not configured", { status: 501 });
  const raw = await req.text();
  const header = req.headers.get("stripe-signature") ?? "";
  const pairs = header.split(",").map((p) => p.split("=") as [string, string]);
  const t = pairs.find(([k]) => k === "t")?.[1];
  const sigs = pairs.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || !sigs.length || Math.abs(Date.now() / 1000 - Number(t)) > 300) return new Response("Bad signature", { status: 400 });
  const expected = Buffer.from(createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex"));
  const valid = sigs.some((v) => { const a = Buffer.from(v); return a.length === expected.length && timingSafeEqual(a, expected); });
  if (!valid) return new Response("Bad signature", { status: 400 });

  const event = JSON.parse(raw);
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const s = event.data.object;
    // Card payments are "paid" immediately; delayed methods arrive later via async_payment_succeeded.
    if (s.payment_status === "paid" || s.payment_status === "no_payment_required") {
      const email: string | undefined = s.customer_details?.email ?? s.customer_email;
      const product: string | undefined = s.metadata?.product_key;
      if (email && product && isProductKey(product)) {
        const isNew = await grantProduct(email, product, "stripe", s.id);
        const user = await ensureAccount(email, s.customer_details?.name ?? "");
        if (s.customer) await setStripeCustomer(user.id, String(s.customer));
        // Care plans: record the subscription straight away; later Stripe events keep it current.
        if (s.mode === "subscription" && s.subscription) {
          const minimal = { id: s.subscription, customer: s.customer, status: "active", metadata: { product_key: product } };
          const full = await stripe("GET", `/subscriptions/${s.subscription}`).catch(() => null); // real status + renewal date
          await syncSubscription(full ?? minimal, product);
        }
        if (isNew) await notify(email, s.customer_details?.name ?? "", product);
      }
    }
  } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    await syncSubscription(event.data.object);
  }
  return new Response("ok");
}

async function notify(email: string, name: string, product: keyof typeof PRODUCTS) {
  const user = await ensureAccount(email, name);
  if (!user.passwordHash) return sendSetupLink(email, "setup"); // new customer: link to create their account
  // Existing customer buying something else: no new password, just tell them it's there.
  const first = user.name.split(" ")[0];
  await sendEmail(
    email,
    `Your ${PRODUCTS[product].name} is ready`,
    `Hi${first ? " " + first : ""},\n\nThanks for your order. ${PRODUCTS[product].name} has been added to your account.\n\nLog in to see what we need from you:\n${appUrl()}/login\n\nThe MTD Back Office team`,
  );
}
