import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { Field, Form } from "@/components/Form";
import { deleteDocument, uploadDocument } from "@/app/actions/data";

export const metadata = { title: "Documents" };
const cats = [["bank", "Bank statements"], ["invoices", "Invoices"], ["receipts", "Receipts"], ["accountant", "From my accountant"], ["ai", "For my AI assistant"], ["other", "Other"]];
const size = (n: number) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);

export default async function Page() {
  const u = await requireUser();
  const db = await getDb();
  const docs = await db.select().from(schema.documents).where(eq(schema.documents.userId, u.id)).orderBy(desc(schema.documents.createdAt));
  return (
    <div>
      <header><p className="eyebrow">Secure upload</p><h1>Documents</h1><p className="muted">PDF, photos, Word, Excel or CSV, up to 10 MB each. Only you and our team can see these.</p></header>
      <section className="card">
        <h2>Upload a file</h2>
        <div style={{ marginTop: 16 }}>
          <Form action={uploadDocument} submit="Upload" reset>
            <Field label="What is it?" name="category">
              <select id="category" name="category">{cats.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            </Field>
            <Field label="File" name="file"><input id="file" name="file" type="file" required accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.doc,.docx,.xls,.xlsx" /></Field>
          </Form>
        </div>
      </section>
      <section className="card">
        <h2>Your files</h2>
        {!docs.length ? <p className="muted">Nothing uploaded yet.</p> : (
          <div className="table-wrap"><table>
            <thead><tr><th>File</th><th>Type</th><th>Added</th><th /></tr></thead>
            <tbody>{docs.map((d) => (
              <tr key={d.id}>
                <td><a href={`/api/documents/${d.id}`}>{d.filename}</a><div className="small muted">{size(d.size)}</div></td>
                <td>{cats.find(([k]) => k === d.category)?.[1]}</td>
                <td>{d.createdAt.toLocaleDateString("en-GB")}</td>
                <td><form action={deleteDocument.bind(null, d.id)}><button className="link-btn danger">Delete</button></form></td>
              </tr>))}</tbody>
          </table></div>
        )}
      </section>
    </div>
  );
}
