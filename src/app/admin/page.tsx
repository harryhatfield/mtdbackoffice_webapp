import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { progressFor } from "@/lib/customers";
import { PRODUCTS, isProductKey } from "@/lib/products";

export const metadata = { title: "Customers" };
export default async function Page() {
  const db = await getDb();
  const users = await db.select().from(schema.users).where(eq(schema.users.role, "customer")).orderBy(desc(schema.users.createdAt));
  const purchases = await db.select().from(schema.purchases);
  const open = await db.select().from(schema.tickets).where(eq(schema.tickets.status, "open"));
  const prog = await progressFor(users.map((u) => u.id));
  const pending = purchases.filter((p) => !p.userId);
  return (
    <div>
      <header><p className="eyebrow">Staff</p><h1>Customers</h1><p className="muted">{users.length} customers · {open.length} open requests</p></header>
      <section className="card"><div className="table-wrap"><table>
        <thead><tr><th>Customer</th><th>Products</th><th>Progress</th><th>Support</th></tr></thead>
        <tbody>
          {users.map((u) => {
            const p = prog.get(u.id); const mine = purchases.filter((x) => x.userId === u.id);
            const n = open.filter((t) => t.userId === u.id).length;
            return <tr key={u.id}>
              <td><Link href={`/admin/customers/${u.id}`}><strong>{u.name || u.email}</strong></Link><div className="small muted">{u.email}{!u.passwordHash && " · not activated"}</div></td>
              <td>{mine.map((m) => isProductKey(m.productKey) ? PRODUCTS[m.productKey].name : m.productKey).join(", ")}</td>
              <td>{p ? `${p.done}/${p.total}` : "—"}</td>
              <td>{n ? <span className="pill pill-warn">{n} open</span> : "—"}</td>
            </tr>;
          })}
          {!users.length && <tr><td colSpan={4} className="muted">No customers yet. <Link href="/admin/customers/new">Add one</Link>.</td></tr>}
        </tbody></table></div></section>
      {pending.length > 0 && <section className="card"><h2>Bought, no account yet</h2>{pending.map((p) => <p key={p.id} className="small">{p.email} · {p.productKey}</p>)}</section>}
    </div>
  );
}
