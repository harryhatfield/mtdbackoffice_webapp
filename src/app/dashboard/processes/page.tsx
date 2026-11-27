import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { ProcessForm } from "@/components/ProcessForm";
import { deleteProcess } from "@/app/actions/data";

export const metadata = { title: "Jobs to automate" };
export default async function Page() {
  const u = await requireUser();
  const db = await getDb();
  const list = await db.select().from(schema.processes).where(eq(schema.processes.userId, u.id)).orderBy(schema.processes.priority, desc(schema.processes.createdAt));
  const hrs = list.reduce((s, p) => s + ((p.timesPerWeek ?? 0) * (p.minutesEach ?? 0)) / 60, 0);
  return (
    <div>
      <header><p className="eyebrow">Automation Sprint</p><h1>Jobs to automate</h1>
        <p className="muted">List the jobs eating your week. We'll pick the three with the biggest payoff. Add at least three.</p></header>
      {list.length > 0 && <div className="card"><h2>{hrs.toFixed(1)} hours a week</h2><p className="muted">is what these {list.length} jobs take today.</p></div>}
      {list.map((p) => (
        <details className="card" key={p.id}>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>{p.name} <span className="pill" style={{ marginLeft: 8 }}>{p.timesPerWeek}× a week, {p.minutesEach} min</span></summary>
          <div style={{ marginTop: 16 }}><ProcessForm p={p} />
            <form action={deleteProcess.bind(null, p.id)} style={{ marginTop: 12 }}><button className="link-btn danger">Delete this job</button></form></div>
        </details>
      ))}
      <section className="card"><h2>Add a job</h2><div style={{ marginTop: 16 }}><ProcessForm /></div></section>
    </div>
  );
}
