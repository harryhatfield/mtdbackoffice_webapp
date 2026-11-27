import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Field, Form } from "@/components/Form";
import { updateAccount } from "@/app/actions/data";

export const metadata = { title: "Account" };
export default async function Page() {
  const u = await requireUser();
  return (
    <div>
      <header><h1>Account</h1></header>
      <section className="card"><h2>Your details</h2><div style={{ marginTop: 16 }}>
        <Form action={updateAccount}>
          <Field label="Your name" name="name" defaultValue={u.name} required />
          <Field label="Email" name="email" defaultValue={u.email} disabled hint="To change your email, message support." />
        </Form></div></section>
      <section className="card"><h2>Password</h2>
        <p className="muted">We'll email you a link to choose a new one.</p>
        <Link className="btn btn-ghost" href="/forgot">Change password</Link></section>
    </div>
  );
}
