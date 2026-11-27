import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getUser, logAudit } from "@/lib/auth";
import { readStored } from "@/lib/storage";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await getUser();
  if (!u) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  const db = await getDb();
  const [d] = await db.select().from(schema.documents).where(eq(schema.documents.id, id));
  if (!d || (d.userId !== u.id && u.role !== "admin")) return new Response("Not found", { status: 404 });
  if (d.userId !== u.id) await logAudit(d.userId, u.id, `document.download:${d.id}`);
  const data = await readStored(d.storageKey).catch(() => null);
  if (!data) return new Response("File missing", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": d.mime,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(d.filename)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
