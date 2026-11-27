import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { decrypt, mask } from "@/lib/crypto";
import { Field, Form } from "@/components/Form";
import { saveBusiness } from "@/app/actions/data";
import { BUSINESS_TYPES, TURNOVER_BANDS } from "@/lib/products";

export const metadata = { title: "Your business" };
export default async function Page() {
  const u = await requireUser();
  const db = await getDb();
  const [b] = await db.select().from(schema.businesses).where(eq(schema.businesses.userId, u.id));
  const v = (k: keyof NonNullable<typeof b>) => (b?.[k] as string | number | null | undefined) ?? "";
  return (
    <div>
      <header><p className="eyebrow">Step 1</p><h1>Your business</h1>
        <p className="muted">The basics we need to set everything up properly. You can come back and change this any time.</p></header>
      <Form action={saveBusiness}>
        <div className="card">
          <h2>About the business</h2>
          <div className="grid2" style={{ marginTop: 16 }}>
            <Field label="Trading name" name="tradingName" defaultValue={v("tradingName")} required />
            <Field label="Business type" name="businessType">
              <select id="businessType" name="businessType" defaultValue={v("businessType")} required>
                <option value="">Choose…</option>
                {BUSINESS_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </Field>
            <Field label="Legal name (if different)" name="legalName" defaultValue={v("legalName")} />
            <Field label="Company number" name="companyNumber" hint="Limited companies only" defaultValue={v("companyNumber")} />
            <Field label="VAT number" name="vatNumber" hint="Leave blank if you're not VAT registered" defaultValue={v("vatNumber")} />
            <Field label="Year end" name="yearEnd" hint="Day-month. Most sole traders: 05-04" placeholder="05-04" defaultValue={v("yearEnd")} />
            <Field label="Roughly how much do you turn over a year?" name="turnoverBand">
              <select id="turnoverBand" name="turnoverBand" defaultValue={v("turnoverBand")}>
                <option value="">Choose…</option>{TURNOVER_BANDS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="People in your team" name="teamSize" type="number" min={1} max={500} defaultValue={v("teamSize")} />
          </div>
        </div>

        <div className="card">
          <h2>Contact &amp; address</h2>
          <div className="grid2" style={{ marginTop: 16 }}>
            <Field label="Address line 1" name="addressLine1" autoComplete="address-line1" defaultValue={v("addressLine1")} />
            <Field label="Address line 2" name="addressLine2" autoComplete="address-line2" defaultValue={v("addressLine2")} />
            <Field label="Town / city" name="city" autoComplete="address-level2" defaultValue={v("city")} />
            <Field label="Postcode" name="postcode" autoComplete="postal-code" defaultValue={v("postcode")} />
            <Field label="Phone" name="phone" type="tel" autoComplete="tel" defaultValue={v("phone")} />
            <Field label="Website" name="website" type="url" placeholder="https://" defaultValue={v("website")} />
          </div>
        </div>

        <div className="card">
          <h2>Tax details</h2>
          <p className="muted small">Stored encrypted. Only used to set up your HMRC connection. We never show these in full, even to you. Leave blank to keep what you've saved.</p>
          <div className="grid2" style={{ marginTop: 16 }}>
            <Field label="UTR" name="utr" hint={b?.utrEnc ? `Saved: ${mask(decrypt(b.utrEnc))}` : "10 digits"} inputMode="numeric" autoComplete="off" />
            <Field label="National Insurance number" name="ni" hint={b?.niEnc ? `Saved: ${mask(decrypt(b.niEnc))}` : "e.g. AB123456C"} autoComplete="off" />
          </div>
        </div>

        <div className="card">
          <h2>How you work today</h2>
          <div className="grid2" style={{ marginTop: 16 }}>
            <Field label="Software you use now" name="currentSoftware" hint="Spreadsheets count!" defaultValue={v("currentSoftware")} />
            <Field label="Business bank" name="bankProvider" defaultValue={v("bankProvider")} />
            <Field label="Accountant's name" name="accountantName" defaultValue={v("accountantName")} />
            <Field label="Accountant's email" name="accountantEmail" type="email" defaultValue={v("accountantEmail")} />
          </div>
          <Field label="Anything else we should know?" name="notes">
            <textarea id="notes" name="notes" defaultValue={v("notes")} />
          </Field>
        </div>
      </Form>
    </div>
  );
}
