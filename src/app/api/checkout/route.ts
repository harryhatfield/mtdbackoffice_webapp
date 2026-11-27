import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getUser } from "@/lib/auth";
import { PRICING, isProductKey } from "@/lib/products";
import { ensurePrice, stripe } from "@/lib/stripe";

/**
 * "Buy" buttons POST here (a plain HTML form, no JS needed), from the landing page and from inside the account.
 * Creates a Stripe Checkout Session and redirects to it. Stripe collects the email and payment (signed-in
 * customers are tied to their account's customer record); the webhook then records the purchase and, for
 * new customers, emails an account set-up link.
 */
export async function POST(req: Request) {
  const origin = (process.env.APP_URL ?? new URL(req.url).origin).replace(/\/$/, "");
  const fail = (to = "/checkout-failed") => Response.redirect(`${origin}${to}`, 303);

  const form = await req.formData().catch(() => null);
  const product = String(form?.get("product") ?? "");
  if (!process.env.STRIPE_SECRET_KEY || !isProductKey(product)) return fail();

  const price = PRICING[product];
  const tax = process.env.STRIPE_AUTOMATIC_TAX === "1"; // enable once Stripe Tax is set up (UK VAT)
  const user = await getUser();
  const subscribing = price.mode === "subscription";
  try {
    let customer: string | undefined;
    if (user) {
      const db = await getDb();
      const [u] = await db.select({ c: schema.users.stripeCustomerId }).from(schema.users).where(eq(schema.users.id, user.id));
      customer = u?.c ?? undefined;
    }
    const session = await stripe<{ url?: string }>("POST", "/checkout/sessions", {
      mode: price.mode,
      success_url: `${origin}${user ? "/dashboard/care?paid=1" : "/thanks"}`,
      cancel_url: `${origin}${user ? "/dashboard/care" : "/#prices"}`,
      billing_address_collection: "auto",
      allow_promotion_codes: "true",
      metadata: { product_key: product },
      line_items: [{ price: await ensurePrice(product), quantity: 1 }],
      ...(customer ? { customer } : user ? { customer_email: user.email } : {}),
      ...(tax ? { automatic_tax: { enabled: "true" }, tax_id_collection: { enabled: "true" } } : {}),
      ...(subscribing
        ? { subscription_data: { metadata: { product_key: product } } }
        : { ...(customer ? {} : { customer_creation: "always" }), invoice_creation: { enabled: "true", invoice_data: { metadata: { product_key: product } } } }),
    });
    if (!session.url) return fail();
    return Response.redirect(session.url, 303);
  } catch (e) {
    console.error("Stripe checkout failed", e);
    return fail();
  }
}
