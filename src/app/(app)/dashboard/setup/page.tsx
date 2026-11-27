import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { userProductKeys } from "@/lib/customers";
import { PRODUCTS, isProductKey } from "@/lib/products";
import { toggleTask } from "@/app/actions/data";

export const metadata = { title: "Your setup" };
const label = { todo: "To do", in_progress: "In progress", done: "Done", blocked: "Waiting on you" } as const;

export default async function Page() {
  const user = await requireUser();
  const db = await getDb();
  const keys = (await userProductKeys(user.id)).filter(isProductKey).filter((k) => PRODUCTS[k].tasks.length);
  const tasks = await db.select().from(schema.tasks).where(eq(schema.tasks.userId, user.id));
  return (
    <div>
      <header><p className="eyebrow">Checklist</p><h1>Your setup</h1><p className="muted">Tick off your steps. We'll update ours as we go.</p></header>
      {!keys.length && <div className="card"><p>No setup in progress.</p></div>}
      {keys.map((k) => (
        <section className="card" key={k}>
          <h2>{PRODUCTS[k].name}</h2>
          {PRODUCTS[k].tasks.map((t) => {
            const st = tasks.find((x) => x.productKey === k && x.taskKey === t.key)?.status ?? "todo";
            const done = st === "done";
            return (
              <div className={`task ${done ? "done" : ""}`} key={t.key}>
                {t.owner === "you" ? (
                  <form action={toggleTask.bind(null, k, t.key, !done)}>
                    <button className={`tick ${done ? "on" : ""}`} aria-label={`${done ? "Mark not done" : "Mark done"}: ${t.title}`}>{done ? "✓" : ""}</button>
                  </form>
                ) : <span className={`tick ${done ? "on" : ""}`} aria-hidden>{done ? "✓" : ""}</span>}
                <div>
                  <h3>{t.title}</h3>
                  <p className="small muted" style={{ margin: 0 }}>{t.help}</p>
                  {t.href && !done && <p style={{ margin: "6px 0 0" }}><Link href={t.href}>Open →</Link></p>}
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <span className="pill">{t.owner === "you" ? "You" : "Us"}</span>
                  <span className={`pill ${done ? "pill-done" : st === "blocked" ? "pill-warn" : ""}`}>{label[st]}</span>
                </div>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
