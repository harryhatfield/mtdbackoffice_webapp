"use client";
import { Field, Form } from "./Form";
import { saveProcess } from "@/app/actions/data";

type P = { id?: string; name?: string; trigger?: string | null; steps?: string | null; tools?: string | null; timesPerWeek?: number | null; minutesEach?: number | null; priority?: number | null };
export function ProcessForm({ p }: { p?: P }) {
  return (
    <Form action={saveProcess} submit={p?.id ? "Update" : "Add this job"} reset={!p?.id}>
      {p?.id && <input type="hidden" name="id" value={p.id} />}
      <Field label="Job name" name="name" placeholder="Chasing late invoices" defaultValue={p?.name} required />
      <Field label="What kicks it off?" name="trigger" hint="e.g. 'A customer enquiry arrives by email'" defaultValue={p?.trigger ?? ""} />
      <Field label="What do you do, step by step?" name="steps">
        <textarea id={`steps-${p?.id ?? "new"}`} name="steps" defaultValue={p?.steps ?? ""} placeholder={"1. Check the email\n2. Look up the price\n3. Write the quote…"} />
      </Field>
      <Field label="Tools involved" name="tools" hint="Gmail, Excel, Xero, WhatsApp…" defaultValue={p?.tools ?? ""} />
      <div className="grid3">
        <Field label="Times a week" name="timesPerWeek" type="number" min={0} defaultValue={p?.timesPerWeek ?? 5} />
        <Field label="Minutes each time" name="minutesEach" type="number" min={0} defaultValue={p?.minutesEach ?? 10} />
        <Field label="Priority" name="priority">
          <select id={`pri-${p?.id ?? "new"}`} name="priority" defaultValue={p?.priority ?? 2}><option value={1}>Top</option><option value={2}>Medium</option><option value={3}>Nice to have</option></select>
        </Field>
      </div>
    </Form>
  );
}
