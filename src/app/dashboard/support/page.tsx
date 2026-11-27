import { desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { userProductKeys } from "@/lib/customers";
import { isCare, PRODUCTS, isProductKey } from "@/lib/products";
import { Field, Form } from "@/components/Form";
import { Thread } from "@/components/Thread";
import { openTicket, replyTicket } from "@/app/actions/data";

export const metadata = { title: "Support" };
export default async function Page() {
  const u = await requireUser();
  const db = await getDb();
  const keys = await userProductKeys(u.id);
  const care = keys.find(isCare);
  const tickets = await db.select().from(schema.tickets).where(eq(schema.tickets.userId, u.id)).orderBy(desc(schema.tickets.lastMessageAt));
  const msgs = tickets.length ? await db.select().from(schema.ticketMessages).where(inArray(schema.ticketMessages.ticketId, tickets.map((t) => t.id))).orderBy(schema.ticketMessages.createdAt) : [];
  return (
    <div>
      <header><p className="eyebrow">Help</p><h1>Support</h1>
        <p className="muted">Everything is designed so you don't need a call. If you're stuck, message us here and we'll reply within one working day.</p></header>

      {care && isProductKey(care) ? (
        <section className="card">
          <div className="row between"><h2>{PRODUCTS[care].name}</h2><span className="pill pill-done">Active</span></div>
          <p className="muted">Your plan includes calls with a real person. Pick a time that suits you.</p>
          <a className="btn btn-brand" href={process.env.NEXT_PUBLIC_BOOKING_URL ?? "mailto:info@mtdbackoffice.co.uk"}>Book a support call</a>
        </section>
      ) : (
        <section className="card"><h2>Want a person on call?</h2>
          <p className="muted">Our care plans add calls and quarterly MTD help from £99 a month.</p>
          <a className="btn btn-ghost" href="mailto:info@mtdbackoffice.co.uk?subject=Care%20plan">Ask about care plans</a></section>
      )}

      <section className="card"><h2>New request</h2><div style={{ marginTop: 16 }}>
        <Form action={openTicket} submit="Send" reset>
          <Field label="Subject" name="subject" required />
          <div className="field"><label htmlFor="body">What do you need help with?</label><textarea id="body" name="body" required /></div>
        </Form></div></section>

      {tickets.map((t) => (
        <details className="card" key={t.id} open={t.status === "open" && tickets[0].id === t.id}>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>{t.subject} <span className={`pill ${t.status === "open" ? "pill-warn" : "pill-done"}`} style={{ marginLeft: 8 }}>{t.status === "open" ? "Open" : "Resolved"}</span></summary>
          <div style={{ marginTop: 16 }}>
            <Thread messages={msgs.filter((m) => m.ticketId === t.id).map((m) => ({ id: m.id, fromStaff: m.fromStaff, body: m.body, createdAt: m.createdAt.toISOString() }))} reply={replyTicket.bind(null, t.id)} />
          </div>
        </details>
      ))}
    </div>
  );
}
