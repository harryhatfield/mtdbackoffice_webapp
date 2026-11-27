import Link from "next/link";
import { AuthShell } from "@/components/Auth";
import { Field, Form } from "@/components/Form";
import { requestReset } from "@/app/actions/auth";
export const metadata = { title: "Reset password" };
export default function Page() {
  return (
    <AuthShell title="Reset your password" lead="We'll email you a link that works for one hour."
      foot={<Link href="/login">Back to log in</Link>}>
      <Form action={requestReset} submit="Email me a link">
        <Field label="Email" name="email" type="email" autoComplete="email" required />
      </Form>
    </AuthShell>
  );
}
