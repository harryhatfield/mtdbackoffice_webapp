import Link from "next/link";
export function AuthShell({ title, lead, children, foot }: { title: string; lead?: string; children: React.ReactNode; foot?: React.ReactNode }) {
  return (
    <main className="auth" id="main">
      <div className="auth-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-primary.svg" alt="MTD Back Office" />
        <h1>{title}</h1>
        {lead && <p className="muted">{lead}</p>}
        {children}
        {foot && <div className="auth-foot">{foot}</div>}
      </div>
    </main>
  );
}
export { Link };
