import "server-only";
import { PRICING, PRODUCTS, type ProductKey } from "./products";

const BASE = () => process.env.STRIPE_API_BASE ?? "https://api.stripe.com";

export class StripeError extends Error {}

/** Flatten nested params into Stripe's form encoding: { a: { b: 1 } } -> a[b]=1 */
function encode(params: Record<string, unknown>, prefix = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((x, i) => (typeof x === "object" ? encode(x as Record<string, unknown>, `${key}[${i}]`, out) : out.append(`${key}[${i}]`, String(x))));
    else if (typeof v === "object") encode(v as Record<string, unknown>, key, out);
    else out.append(key, String(v));
  }
  return out;
}

export async function stripe<T = any>(method: "GET" | "POST", path: string, params: Record<string, unknown> = {}): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new StripeError("Stripe is not configured");
  const body = encode(params);
  const url = `${BASE()}/v1${path}${method === "GET" && body.size ? `?${body}` : ""}`;
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${key}`, ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) },
    body: method === "POST" ? body : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new StripeError(data?.error?.message ?? `Stripe error ${res.status}`);
  return data as T;
}

const priceCache = new Map<string, string>();

/**
 * Each of our packages is a real Stripe Product + Price, found by a stable lookup key
 * (the product key, e.g. "care_99") and created on first use. That's what lets customers
 * switch plans, and keeps invoices and reports tidy in the Stripe dashboard.
 * NOTE: changing a price later means creating a new Price in Stripe and moving the lookup key.
 */
export async function ensurePrice(key: ProductKey): Promise<string> {
  const cached = priceCache.get(key);
  if (cached) return cached;
  const find = async () => {
    const r = await stripe<{ data: { id: string }[] }>("GET", "/prices", { "lookup_keys[]": key, active: "true", limit: 1 });
    return r.data[0]?.id;
  };
  let id = await find();
  if (!id) {
    const p = PRICING[key];
    const product = await stripe<{ id: string }>("POST", "/products", {
      name: `MTD Back Office: ${PRODUCTS[key].name}${key.startsWith("care_") && key !== "care_99" ? ` (${key === "care_299" ? "Growth" : "Pro"})` : ""}`,
      description: p.description,
      metadata: { product_key: key },
    });
    try {
      id = (await stripe<{ id: string }>("POST", "/prices", {
        product: product.id, currency: "gbp", unit_amount: p.pence, lookup_key: key,
        tax_behavior: process.env.STRIPE_AUTOMATIC_TAX === "1" ? "exclusive" : "unspecified",
        ...(p.mode === "subscription" ? { recurring: { interval: "month" } } : {}),
        metadata: { product_key: key },
      })).id;
    } catch (e) {
      id = await find(); // another request created it first
      if (!id) throw e;
    }
  }
  priceCache.set(key, id);
  return id;
}
