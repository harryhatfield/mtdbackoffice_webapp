import { Field, Form } from "@/components/Form";
import { createCustomer } from "@/app/actions/admin";
import { PRODUCTS } from "@/lib/products";
export const metadata = { title: "Add customer" };
export default function Page() {
  return (
    <div>
      <header><h1>Add customer</h1><p className="muted">For sales that didn't come through Stripe. They'll get a link to set a password.</p></header>
      <section className="card"><Form action={createCustomer} submit="Add customer">
        <Field label="Name" name="name" />
        <Field label="Email" name="email" type="email" required />
        <Field label="Product" name="product"><select id="product" name="product" required>
          {Object.entries(PRODUCTS).map(([k, p]) => <option key={k} value={k}>{p.name} ({p.price})</option>)}</select></Field>
        <label className="check" style={{ marginBottom: 16 }}><input type="checkbox" name="invite" defaultChecked /> Email them an invite now</label>
      </Form></section>
    </div>
  );
}
