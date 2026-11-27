import { requireAdmin } from "@/lib/auth";
import { Shell } from "@/components/Shell";
export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return <Shell user={user} tag="Staff" items={[
    { href: "/admin", label: "Customers" }, { href: "/admin/customers/new", label: "Add customer" }, { href: "/dashboard", label: "← Customer view" },
  ]}>{children}</Shell>;
}
