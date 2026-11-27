import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/Auth";
import { Field, Form } from "@/components/Form";
import { login } from "@/app/actions/auth";
import { getUser } from "@/lib/auth";

export const metadata = { title: "Log in" };
export default async function Page() {
  const user = await getUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/dashboard"); // already signed in
  return (
    <AuthShell title="Welcome back" lead="Log in to see your setup and send us what we need."
      foot={<><Link href="/forgot">Forgotten your password?</Link><Link href="/activate">First time here?</Link></>}>
      <Form action={login} submit="Log in">
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field label="Password" name="password" type="password" autoComplete="current-password" required />
      </Form>
    </AuthShell>
  );
}
