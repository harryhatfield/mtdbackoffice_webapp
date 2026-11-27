import { logout } from "@/app/actions/auth";
import type { SessionUser } from "@/lib/auth";
import { Nav } from "./Nav";

export function Shell({ user, items, children, tag }: {
  user: SessionUser; items: { href: string; label: string; badge?: number }[]; children: React.ReactNode; tag?: string;
}) {
  return (
    <div className="shell">
      <aside className="side">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-reversed.svg" alt="MTD Back Office" />
        {tag && <span className="eyebrow" style={{ color: "var(--accent)", margin: "0 14px 8px" }}>{tag}</span>}
        <Nav items={items} />
        <div className="who">
          <div style={{ color: "#fff", fontWeight: 700 }}>{user.name || user.email}</div>
          <div style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</div>
          <form action={logout} style={{ marginTop: 8 }}><button className="link-btn">Log out</button></form>
        </div>
      </aside>
      <main className="main" id="main">{children}</main>
    </div>
  );
}
