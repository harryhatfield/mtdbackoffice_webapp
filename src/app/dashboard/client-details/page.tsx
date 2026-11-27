import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { Field, Form } from "@/components/Form";
import { saveClientDetails } from "@/app/actions/data";
import { ReminderPreview } from "@/components/ReminderPreview";

export const metadata = { title: "What your clients see" };
export default async function Page() {
  const u = await requireUser();
  const db = await getDb();
  const [c] = await db.select().from(schema.clientDetails).where(eq(schema.clientDetails.userId, u.id));
  const [b] = await db.select().from(schema.businesses).where(eq(schema.businesses.userId, u.id));
  const v = (k: keyof NonNullable<typeof c>) => (c?.[k] as string | number | undefined) ?? "";
  const days = (c?.reminderDays as number[] | undefined) ?? [3, 7, 14];
  return (
    <div>
      <header><p className="eyebrow">Step 2</p><h1>What your clients see</h1>
        <p className="muted">Everything on this page goes on the invoices and reminders we send <em>to your clients</em>, so it looks and sounds like you.</p></header>
      <Form action={saveClientDetails}>
        <div className="card">
          <h2>Who the message comes from</h2>
          <div className="grid2" style={{ marginTop: 16 }}>
            <Field label="Name clients know you by" name="displayName" defaultValue={v("displayName") || b?.tradingName || ""} required />
            <Field label="Reply-to email" name="replyToEmail" type="email" defaultValue={v("replyToEmail")} required />
            <Field label="Phone on invoices" name="contactPhone" type="tel" defaultValue={v("contactPhone") || b?.phone || ""} />
            <Field label="Invoice number prefix" name="invoicePrefix" defaultValue={v("invoicePrefix") || "INV-"} />
          </div>
        </div>
        <div className="card">
          <h2>How you get paid</h2>
          <div className="grid2" style={{ marginTop: 16 }}>
            <Field label="Payment terms (days)" name="paymentTermsDays" type="number" min={0} max={120} defaultValue={v("paymentTermsDays") || 14} />
            <Field label="Online payment link" name="paymentLink" type="url" hint="Optional. Starts with https://" defaultValue={v("paymentLink")} />
            <Field label="Account name" name="accountName" defaultValue={v("accountName")} />
            <Field label="Sort code" name="sortCode" placeholder="12-34-56" defaultValue={v("sortCode")} />
            <Field label="Account number" name="accountNumber" inputMode="numeric" defaultValue={v("accountNumber")} />
            <Field label="Late payment note" name="lateFeeNote" hint="Optional, e.g. 'Interest charged on overdue invoices.'" defaultValue={v("lateFeeNote")} />
          </div>
        </div>
        <div className="card">
          <h2>Reminders</h2>
          <div className="grid2" style={{ marginTop: 16 }}>
            <Field label="Tone" name="reminderTone">
              <select id="reminderTone" name="reminderTone" defaultValue={v("reminderTone") || "friendly"}>
                <option value="friendly">Friendly</option><option value="neutral">Neutral</option><option value="firm">Firm</option>
              </select>
            </Field>
            <div />
          </div>
          <p className="label">Send reminders this many days after the due date</p>
          <div className="grid3" style={{ marginTop: 8 }}>
            {[0, 1, 2].map((i) => <Field key={i} label={`Reminder ${i + 1}`} name={`remind${i + 1}`} type="number" min={0} max={90} defaultValue={days[i] ?? ""} />)}
          </div>
          <Field label="Email sign-off" name="signature" hint="e.g. 'Thanks, Sam, Sam's Plumbing'">
            <textarea id="signature" name="signature" defaultValue={v("signature")} />
          </Field>
        </div>
        <div className="card"><h2>Preview</h2><p className="muted small">An example of what your client would receive.</p><ReminderPreview /></div>
      </Form>
    </div>
  );
}
