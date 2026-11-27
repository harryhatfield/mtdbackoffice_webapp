import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { userProductKeys } from "@/lib/customers";
import { PRODUCTS, isProductKey } from "@/lib/products";

export const metadata = { title: "Overview" };
export default async function Page() {
  const user = await requireUser();
  const db = await getDb();
  const keys = (await userProductKeys(user.id)).filter(isProductKey);
  const tasks = await db.select().from(schema.tasks).where(eq(schema.tasks.userId, user.id));
  const first = user.name.split(" ")[0];

  // Next things only *you* need to do (de-duplicated across products)
  const seen = new Set<string>();
  const todo = keys.flatMap((k) => PRODUCTS[k].tasks.filter((t) => t.owner === "you").map((t) => ({ ...t, k })))
    .filter((t) => tasks.find((x) => x.productKey === t.k && x.taskKey === t.key)?.status !== "done")
    .filter((t) => (seen.has(t.key) ? false : (seen.add(t.key), true)));

  return (
    <div className="stack">
      <header>
        <p className="eyebrow">Your account</p>
        <h1>{first ? `Hi ${first}, ` : "Hi, "}here's where things are</h1>
      </header>

      {!keys.length && <div className="card"><h2>No products on your account yet</h2><p className="muted">If you've just bought, give it a minute and refresh. Still nothing? <Link href="/dashboard/support">Message us</Link>.</p></div>}

      {keys.map((k) => {
        const p = PRODUCTS[k];
        const mine = tasks.filter((t) => t.productKey === k);
        const done = mine.filter((t) => t.status === "done").length;
        const pct = mine.length ? Math.round((done / mine.length) * 100) : 100;
        return (
          <section className="card" key={k}>
            <div className="row between"><h2>{p.name}</h2><span className="pill">{p.price}</span></div>
            <p className="muted">{p.blurb}</p>
            {mine.length > 0 && <>
              <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${p.name} progress`}><span style={{ width: `${pct}%` }} /></div>
              <p className="small muted" style={{ marginTop: 8 }}>{done} of {mine.length} steps done</p>
            </>}
          </section>
        );
      })}

      {todo.length > 0 && (
        <section className="card">
          <h2>Your next steps</h2>
          <p className="muted small">These are the bits only you can do. Everything else is on us.</p>
          {todo.slice(0, 4).map((t) => (
            <div className="task" key={t.key} style={{ gridTemplateColumns: "1fr auto" }}>
              <div><h3>{t.title}</h3><p className="small muted" style={{ margin: 0 }}>{t.help}</p></div>
              {t.href && <Link className="btn btn-brand btn-sm" href={t.href}>Do this</Link>}
            </div>
          ))}
        </section>
      )}
      {keys.length > 0 && todo.length === 0 && <div className="card"><h2>You're all caught up</h2><p className="muted">Nothing needed from you right now. We'll email you when there's an update.</p></div>}
    </div>
  );
}
