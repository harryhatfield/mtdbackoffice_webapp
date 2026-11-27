import Link from "next/link";
import { AuthShell } from "@/components/Auth";
import { Field, Form } from "@/components/Form";
import { requestActivation } from "@/app/actions/auth";
export const metadata = { title: "Activate your account" };
export default function Page() {
  return (
    <AuthShell title="Activate your account" lead="Bought something from us? Enter the email you used and we'll send you a link to choose a password."
      foot={<Link href="/login">Already activated? Log in</Link>}>
      <Form action={requestActivation} submit="Email me a link">
        <Field label="Email you purchased with" name="email" type="email" autoComplete="email" required />
      </Form>
    </AuthShell>
  );
}
