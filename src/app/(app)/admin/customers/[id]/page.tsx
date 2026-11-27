import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { PRODUCTS, isProductKey } from "@/lib/products";
import { Field, Form } from "@/components/Form";
import { Thread } from "@/components/Thread";
import { RevealSensitive } from "@/components/RevealSensitive";
import { getSubscription } from "@/lib/billing";
import { addProduct, maskedSensitive, resendInvite, setTaskStatus, staffReply } from "@/app/actions/admin";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = await getDb();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, id));
  if (!u) notFound();
  const [b] = await db.select().from(schema.businesses).where(eq(schema.businesses.userId, id));
  const [c] = await db.select().from(schema.clientDetails).where(eq(schema.clientDetails.userId, id));
  const purchases = await db.select().from(schema.purchases).where(eq(schema.purchases.userId, id));
  const tasks = await db.select().from(schema.tasks).where(eq(schema.tasks.userId, id));
  const procs = await db.select().from(schema.processes).where(eq(schema.processes.userId, id));
  const docs = await db.select().from(schema.documents).where(eq(schema.documents.userId, id));
  const tickets = await db.select().from(schema.tickets).where(eq(schema.tickets.userId, id)).orderBy(desc(schema.tickets.lastMessageAt));
  const msgs = await db.select().from(schema.ticketMessages).orderBy(schema.ticketMessages.createdAt);
  const sens = await maskedSensitive(id);
  const sub = await getSubscription(id);
  const keys = [...new Set(purchases.map((p) => p.productKey))].filter(isProductKey);
  const row = (k: string, v: unknown) => v ? <tr key={k}><td className="muted" style={{ width: 200 }}>{k}</td><td>{String(v)}</td></tr> : null;

  return (
    <div>
      <header>
        <p className="eyebrow">Customer</p><h1>{u.name || u.email}</h1>
        <p className="muted">{u.email} · {u.passwordHash ? "activated" : "not activated yet"}</p>
        <form action={resendInvite.bind(null, id)}><button className="link-btn">{u.passwordHash ? "Send password reset" : "Resend invite"}</button></form>
      </header>

      <section className="card"><h2>Products</h2>
        <p>{purchases.map((p) => `${isProductKey(p.productKey) ? PRODUCTS[p.productKey].name : p.productKey} (${p.source})`).join(" · ") || "None"}</p>
        <Form action={addProduct.bind(null, id)} submit="Add product">
          <Field label="Add product" name="product"><select id="product" name="product">{Object.entries(PRODUCTS).map(([k, p]) => <option key={k} value={k}>{p.name}</option>)}</select></Field>
        </Form></section>

      <section className="card"><h2>Billing</h2>
        {sub ? <p>Care plan: <strong>{isProductKey(sub.productKey) ? PRODUCTS[sub.productKey].name : sub.productKey}</strong> · <span className={`pill ${sub.status === "active" ? "pill-done" : "pill-warn"}`}>{sub.status}{sub.cancelAtPeriodEnd ? " (ending)" : ""}</span>
          {sub.currentPeriodEnd && <span className="muted"> · {sub.cancelAtPeriodEnd ? "ends" : "renews"} {sub.currentPeriodEnd.toLocaleDateString("en-GB")}</span>}</p>
          : <p className="muted">No Stripe care subscription.</p>}
        {u.stripeCustomerId && <p className="small muted">Stripe customer {u.stripeCustomerId}</p>}</section>

      {keys.filter((k) => PRODUCTS[k].tasks.length).map((k) => (
        <section className="card" key={k}><h2>{PRODUCTS[k].name} checklist</h2>
          {PRODUCTS[k].tasks.map((t) => {
            const st = tasks.find((x) => x.productKey === k && x.taskKey === t.key)?.status ?? "todo";
            return <div className="task" key={t.key} style={{ gridTemplateColumns: "1fr auto" }}>
              <div><h3>{t.title}</h3><span className="pill">{t.owner === "you" ? "Customer" : "Us"}</span></div>
              <div className="row">{(["todo", "in_progress", "blocked", "done"] as const).map((s) =>
                <form key={s} action={setTaskStatus.bind(null, id, k, t.key, s)}><button className={`btn btn-sm ${st === s ? "btn-brand" : "btn-ghost"}`}>{s.replace("_", " ")}</button></form>)}</div>
            </div>;
          })}</section>
      ))}

      <section className="card"><h2>Business</h2>
        {b ? <><div className="table-wrap"><table><tbody>
          {row("Trading name", b.tradingName)}{row("Type", b.businessType)}{row("Legal name", b.legalName)}{row("Company no.", b.companyNumber)}
          {row("VAT", b.vatNumber)}{row("Year end", b.yearEnd)}{row("Turnover", b.turnoverBand)}{row("Team", b.teamSize)}
          {row("Address", [b.addressLine1, b.addressLine2, b.city, b.postcode].filter(Boolean).join(", "))}{row("Phone", b.phone)}{row("Website", b.website)}
          {row("Software", b.currentSoftware)}{row("Bank", b.bankProvider)}{row("Accountant", [b.accountantName, b.accountantEmail].filter(Boolean).join(" · "))}{row("Notes", b.notes)}
        </tbody></table></div><RevealSensitive userId={id} utr={sens.utr} ni={sens.ni} /></> : <p className="muted">Not filled in yet.</p>}</section>

      <section className="card"><h2>Client-facing details</h2>
        {c ? <div className="table-wrap"><table><tbody>
          {row("Display name", c.displayName)}{row("Reply-to", c.replyToEmail)}{row("Phone", c.contactPhone)}{row("Invoice prefix", c.invoicePrefix)}
          {row("Terms (days)", c.paymentTermsDays)}{row("Bank", [c.accountName, c.sortCode, c.accountNumber].filter(Boolean).join(" · "))}{row("Payment link", c.paymentLink)}
          {row("Tone", c.reminderTone)}{row("Reminder days", (c.reminderDays as number[] | null)?.join(", "))}{row("Sign-off", c.signature)}{row("Late note", c.lateFeeNote)}
        </tbody></table></div> : <p className="muted">Not filled in yet.</p>}</section>

      {procs.length > 0 && <section className="card"><h2>Jobs to automate</h2>{procs.map((p) => <div key={p.id} style={{ marginBottom: 14 }}>
        <h3>{p.name} <span className="pill">{p.timesPerWeek}×/wk · {p.minutesEach} min · P{p.priority}</span></h3>
        <p className="small muted" style={{ margin: 0 }}>Trigger: {p.trigger || "—"} · Tools: {p.tools || "—"}</p><p className="small" style={{ whiteSpace: "pre-wrap" }}>{p.steps}</p></div>)}</section>}

      <section className="card"><h2>Documents</h2>{docs.length ? docs.map((d) => <p key={d.id} className="small"><a href={`/api/documents/${d.id}`}>{d.filename}</a> · {d.category}</p>) : <p className="muted">None.</p>}</section>

      <section className="card"><h2>Support</h2>{tickets.length ? tickets.map((t) => <details key={t.id} open={t.status === "open"} style={{ marginBottom: 12 }}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>{t.subject} <span className={`pill ${t.status === "open" ? "pill-warn" : "pill-done"}`}>{t.status}</span></summary>
        <div style={{ marginTop: 12 }}><Thread staff messages={msgs.filter((m) => m.ticketId === t.id).map((m) => ({ id: m.id, fromStaff: m.fromStaff, body: m.body, createdAt: m.createdAt.toISOString() }))} reply={staffReply.bind(null, t.id)} /></div>
      </details>) : <p className="muted">No requests.</p>}</section>
    </div>
  );
}
