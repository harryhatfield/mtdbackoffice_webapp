"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Nav({ items }: { items: { href: string; label: string; badge?: number }[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Main" style={{ display: "contents" }}>
      {items.map((i) => {
        const current = i.href === "/dashboard" || i.href === "/admin" ? path === i.href : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} className="nav" aria-current={current ? "page" : undefined}>
            {i.label}{!!i.badge && <span className="badge">{i.badge}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
