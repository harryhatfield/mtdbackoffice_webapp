import { createHmac, timingSafeEqual } from "node:crypto";
import { grantProduct, sendSetupLink } from "@/lib/customers";
import { isProductKey } from "@/lib/products";

/**
 * Stripe → grant product on purchase.
 * In Stripe, add metadata `product_key` (setup | sprint | care_99 | care_299 | care_599)
 * to the Payment Link / Checkout Session (or to the Price → "product_key" in session metadata).
 * Webhook event: checkout.session.completed
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Not configured", { status: 501 });
  const raw = await req.text();
  const header = req.headers.get("stripe-signature") ?? "";
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = parts.t, v1 = parts.v1;
  if (!t || !v1 || Math.abs(Date.now() / 1000 - Number(t)) > 300) return new Response("Bad signature", { status: 400 });
  const expected = createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(v1);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return new Response("Bad signature", { status: 400 });

  const event = JSON.parse(raw);
  if (event.type === "checkout.session.completed") {
    const s = event.data.object;
    const email: string | undefined = s.customer_details?.email ?? s.customer_email;
    const product: string | undefined = s.metadata?.product_key;
    if (email && product && isProductKey(product)) {
      await grantProduct(email, product, "stripe", s.id);
      await sendSetupLink(email, "setup");
    }
  }
  return new Response("ok");
}
