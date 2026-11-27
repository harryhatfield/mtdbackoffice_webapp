import Link from "next/link";
import { AuthShell } from "@/components/Auth";
import { Field, Form } from "@/components/Form";
import { setPassword } from "@/app/actions/auth";
export const metadata = { title: "Choose a password" };
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) return <AuthShell title="Link missing" lead="Open the link from your email, or request a new one." foot={<Link href="/forgot">Request a new link</Link>}><></></AuthShell>;
  return (
    <AuthShell title="Choose a password" lead="At least 10 characters. A few random words works well.">
      <Form action={setPassword} submit="Save and continue">
        <input type="hidden" name="token" value={token} />
        <Field label="New password" name="password" type="password" autoComplete="new-password" minLength={10} required />
        <Field label="Confirm password" name="confirm" type="password" autoComplete="new-password" minLength={10} required />
      </Form>
    </AuthShell>
  );
}
