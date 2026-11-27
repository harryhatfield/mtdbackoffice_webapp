import { and, eq, ne } from "drizzle-orm";
import { count } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { userProductKeys } from "@/lib/customers";
import { isCare } from "@/lib/products";
import { Shell } from "@/components/Shell";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const db = await getDb();
  const keys = await userProductKeys(user.id);
  const [{ n }] = await db.select({ n: count() }).from(schema.tasks)
    .where(and(eq(schema.tasks.userId, user.id), ne(schema.tasks.status, "done")));
  const hasSprint = keys.includes("sprint");
  const items = [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/setup", label: "Your setup", badge: n },
    { href: "/dashboard/business", label: "Your business" },
    { href: "/dashboard/client-details", label: "What your clients see" },
    ...(hasSprint ? [{ href: "/dashboard/processes", label: "Jobs to automate" }] : []),
    { href: "/dashboard/documents", label: "Documents" },
    { href: "/dashboard/support", label: keys.some(isCare) ? "Support & calls" : "Support" },
    { href: "/dashboard/account", label: "Account" },
    ...(user.role === "admin" ? [{ href: "/admin", label: "Admin →" }] : []),
  ];
  return <Shell user={user} items={items}>{children}</Shell>;
}
