import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { CARE_ORDER, LIVE_STATUSES, getSubscription } from "@/lib/billing";
import { PRICING, PRODUCTS, isProductKey } from "@/lib/products";
import { Form } from "@/components/Form";
import { cancelPlan, changePlan, openPortal, resumePlan } from "@/app/actions/billing";

export const metadata = { title: "Care plan" };
const gbp = (p: number) => `£${p / 100}`;
const date = (d: Date | null) => (d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "");

export default async function Page({ searchParams }: { searchParams: Promise<{ paid?: string; msg?: string; plan?: string }> }) {
  const user = await requireUser();
  const { paid, msg, plan } = await searchParams;
  const db = await getDb();
  const sub = await getSubscription(user.id);
  const live = sub && LIVE_STATUSES.includes(sub.status) ? sub : null;
  const [u] = await db.select({ c: schema.users.stripeCustomerId }).from(schema.users).where(eq(schema.users.id, user.id));
  // Only plans an admin granted by hand count here; a Stripe purchase whose subscription has ended does not.
  const manual = !live && (await db.select({ k: schema.purchases.productKey, src: schema.purchases.source }).from(schema.purchases)
    .where(eq(schema.purchases.userId, user.id))).some((r) => r.k.startsWith("care_") && r.src === "manual");
  const idx = (k: string) => CARE_ORDER.indexOf(k as (typeof CARE_ORDER)[number]);

  return (
    <div>
      <header><p className="eyebrow">Ongoing support</p><h1>Care plan</h1>
        <p className="muted">We check everything monthly, fix what breaks and remind you before each quarterly deadline.</p></header>

      {msg === "changed" && plan && isProductKey(plan) && <div className="alert alert-ok" role="status">You&#39;re now on {PRODUCTS[plan].name}. We&#39;ve adjusted your next invoice for the difference.</div>}
      {msg === "ending" && <div className="alert alert-ok" role="status">Your care plan won&#39;t renew. It stays active until the end of the period you&#39;ve paid for, and you can change your mind before then.</div>}
      {msg === "resumed" && <div className="alert alert-ok" role="status">Welcome back. Your care plan will keep renewing.</div>}
      {paid && !live && <div className="alert alert-ok" role="status">Payment received. Your plan will show here in a moment. Refresh if it hasn&#39;t appeared.</div>}
      {live?.status === "past_due" && <div className="alert alert-error" role="alert">Your last payment didn&#39;t go through. Please update your card below so your plan isn&#39;t interrupted.</div>}

      {manual && (
        <section className="card"><h2>Your care plan was set up by our team</h2>
          <p className="muted">To change or stop it, message us from the <a href="/dashboard/support">Support</a> page.</p></section>
      )}

      {live && (
        <section className="card">
          <div className="row between"><h2>{PRODUCTS[live.productKey as keyof typeof PRODUCTS]?.name}</h2>
            <span className={`pill ${live.cancelAtPeriodEnd ? "pill-warn" : "pill-done"}`}>{live.cancelAtPeriodEnd ? "Ending" : "Active"}</span></div>
          <p className="muted">{gbp(PRICING[live.productKey as keyof typeof PRICING].pence)} a month, ex-VAT.{" "}
            {live.cancelAtPeriodEnd ? `Ends on ${date(live.currentPeriodEnd)}. You keep full support until then.` : live.currentPeriodEnd ? `Renews on ${date(live.currentPeriodEnd)}.` : ""}</p>
          {live.cancelAtPeriodEnd && (
            <Form action={resumePlan} submit="Keep my plan" buttonClass="btn btn-brand"><span /></Form>
          )}
        </section>
      )}

      {live && (
        <section className="card">
          <h2>Change plan</h2>
          <p className="muted small">Switching takes effect today. Stripe works out the difference for the rest of this month and adds or deducts it on your next invoice.{live.cancelAtPeriodEnd ? " Switching plans also keeps your plan renewing." : ""}</p>
          {CARE_ORDER.map((k) => {
            const current = k === live.productKey;
            return (
              <div className="task" key={k} style={{ gridTemplateColumns: "1fr auto" }}>
                <div><h3>{PRODUCTS[k].name} <span className="pill">{gbp(PRICING[k].pence)}/month</span> {current && <span className="pill pill-done">Your plan</span>}</h3>
                  <p className="small muted" style={{ margin: 0 }}>{PRICING[k].description}</p></div>
                {!current && (
                  <Form action={changePlan.bind(null, k)} submit={idx(k) > idx(live.productKey) ? "Upgrade" : "Downgrade"} buttonClass="btn btn-ghost btn-sm"><span /></Form>
                )}
              </div>
            );
          })}
        </section>
      )}

      {!live && !manual && (
        <section className="card">
          <h2>Add a care plan</h2>
          <p className="muted small">Cancel or switch any time from this page.</p>
          {CARE_ORDER.map((k) => (
            <div className="task" key={k} style={{ gridTemplateColumns: "1fr auto" }}>
              <div><h3>{PRODUCTS[k].name} <span className="pill">{gbp(PRICING[k].pence)}/month</span></h3>
                <p className="small muted" style={{ margin: 0 }}>{PRICING[k].description}</p></div>
              <form method="post" action="/api/checkout"><input type="hidden" name="product" value={k} /><button className="btn btn-brand btn-sm">Start</button></form>
            </div>
          ))}
        </section>
      )}

      {live && !live.cancelAtPeriodEnd && (
        <section className="card">
          <details>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>Remove my care plan</summary>
            <p className="muted" style={{ marginTop: 12 }}>It won&#39;t renew. You keep everything until {date(live.currentPeriodEnd) || "the end of this period"}, and you can change your mind before then.</p>
            <Form action={cancelPlan} submit="Yes, remove my plan" buttonClass="btn btn-ghost btn-sm"><span /></Form>
          </details>
        </section>
      )}

      {u?.c && (
        <section className="card">
          <h2>Card, invoices and receipts</h2>
          <p className="muted small">Opens Stripe&#39;s secure billing page, where you can update your card and download invoices.</p>
          <Form action={openPortal} submit="Manage billing" buttonClass="btn btn-ghost"><span /></Form>
        </section>
      )}
    </div>
  );
}
