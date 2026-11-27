"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { logAudit, requireUser } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { emailOk, int, str, type FormState } from "@/lib/form";
import { PRODUCTS, isProductKey } from "@/lib/products";
import { ALLOWED_MIME, MAX_BYTES, deleteStored, saveFile } from "@/lib/storage";
import { sendEmail } from "@/lib/email";

const UTR = /^\d{10}$/;
const NINO = /^[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$/;

export async function saveBusiness(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  const accEmail = str(fd, "accountantEmail", 254);
  if (accEmail && !emailOk(accEmail)) return { error: "The accountant's email doesn't look right." };
  const yearEnd = str(fd, "yearEnd", 5);
  if (yearEnd && !/^\d{2}-\d{2}$/.test(yearEnd)) return { error: "Year end should look like 05-04 (day-month)." };

  const values: Record<string, unknown> = {
    tradingName: str(fd, "tradingName", 120), businessType: str(fd, "businessType", 30), legalName: str(fd, "legalName", 120),
    companyNumber: str(fd, "companyNumber", 12), vatNumber: str(fd, "vatNumber", 20).toUpperCase(), yearEnd,
    turnoverBand: str(fd, "turnoverBand", 40), addressLine1: str(fd, "addressLine1", 120), addressLine2: str(fd, "addressLine2", 120),
    city: str(fd, "city", 80), postcode: str(fd, "postcode", 10).toUpperCase(), phone: str(fd, "phone", 30),
    website: str(fd, "website", 200), teamSize: int(fd, "teamSize"), currentSoftware: str(fd, "currentSoftware", 120),
    bankProvider: str(fd, "bankProvider", 80), accountantName: str(fd, "accountantName", 120), accountantEmail: accEmail,
    notes: str(fd, "notes", 2000), updatedAt: new Date(),
  };
  if (!values.tradingName) return { error: "Please add your trading name." };
  if (!values.businessType) return { error: "Please choose what type of business you run." };

  // Sensitive IDs: only overwritten when a new value is typed; blank keeps the saved one.
  const utr = str(fd, "utr", 20).replace(/\s/g, "");
  const ni = str(fd, "ni", 20).replace(/\s/g, "").toUpperCase();
  if (utr) { if (!UTR.test(utr)) return { error: "A UTR is 10 digits." }; values.utrEnc = encrypt(utr); }
  if (ni) { if (!NINO.test(ni)) return { error: "That National Insurance number doesn't look right (e.g. AB123456C)." }; values.niEnc = encrypt(ni); }

  const db = await getDb();
  await db.insert(schema.businesses).values({ userId: u.id, ...values }).onConflictDoUpdate({ target: schema.businesses.userId, set: values });
  await autoComplete(u.id, "business");
  await logAudit(u.id, u.id, "business.save");
  revalidatePath("/dashboard", "layout");
  return { ok: "Saved. Thank you." };
}

const clientSchema = z.object({
  displayName: z.string().min(1, "Add the name your clients know you by."),
  replyToEmail: z.string().refine(emailOk, "Add a valid email for client replies."),
  contactPhone: z.string().max(30),
  invoicePrefix: z.string().max(10),
  paymentTermsDays: z.number().int().min(0).max(120),
  accountName: z.string().max(80),
  sortCode: z.string().regex(/^(\d{2}-?\d{2}-?\d{2})?$/, "Sort code should be 6 digits, e.g. 12-34-56."),
  accountNumber: z.string().regex(/^(\d{8})?$/, "Account number should be 8 digits."),
  paymentLink: z.string().max(300).refine((v) => !v || /^https:\/\//.test(v), "Payment link must start with https://"),
  reminderTone: z.enum(["friendly", "neutral", "firm"]),
  signature: z.string().max(600),
  lateFeeNote: z.string().max(300),
});

export async function saveClientDetails(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  const days = [1, 2, 3].map((i) => int(fd, `remind${i}`)).filter((n): n is number => n !== null && n >= 0 && n <= 90);
  const parsed = clientSchema.safeParse({
    displayName: str(fd, "displayName", 120), replyToEmail: str(fd, "replyToEmail", 254), contactPhone: str(fd, "contactPhone", 30),
    invoicePrefix: str(fd, "invoicePrefix", 10), paymentTermsDays: int(fd, "paymentTermsDays") ?? 14,
    accountName: str(fd, "accountName", 80), sortCode: str(fd, "sortCode", 8), accountNumber: str(fd, "accountNumber", 8).replace(/\s/g, ""),
    paymentLink: str(fd, "paymentLink", 300), reminderTone: str(fd, "reminderTone", 10), signature: str(fd, "signature", 600),
    lateFeeNote: str(fd, "lateFeeNote", 300),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const values = { ...parsed.data, reminderDays: days.length ? days : [3, 7, 14], updatedAt: new Date() };
  const db = await getDb();
  await db.insert(schema.clientDetails).values({ userId: u.id, ...values }).onConflictDoUpdate({ target: schema.clientDetails.userId, set: values });
  await autoComplete(u.id, "client_details");
  await logAudit(u.id, u.id, "client_details.save");
  revalidatePath("/dashboard", "layout");
  return { ok: "Saved. We'll use these on everything we send to your clients." };
}

/** Mark a checklist item done across every product the customer has that includes it. */
export async function autoComplete(userId: string, taskKey: string) {
  const db = await getDb();
  await db.update(schema.tasks).set({ status: "done", completedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(schema.tasks.userId, userId), eq(schema.tasks.taskKey, taskKey)));
}

export async function toggleTask(productKey: string, taskKey: string, done: boolean) {
  const u = await requireUser();
  if (!isProductKey(productKey)) return;
  const def = PRODUCTS[productKey].tasks.find((t) => t.key === taskKey);
  if (!def || def.owner !== "you") return; // customers only tick their own items
  const db = await getDb();
  await db.update(schema.tasks).set({ status: done ? "done" : "todo", completedAt: done ? new Date() : null, updatedAt: new Date() })
    .where(and(eq(schema.tasks.userId, u.id), eq(schema.tasks.productKey, productKey), eq(schema.tasks.taskKey, taskKey)));
  revalidatePath("/dashboard", "layout");
}

export async function saveProcess(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  const name = str(fd, "name", 120);
  if (!name) return { error: "Give the job a short name, like 'Chasing late invoices'." };
  const values = {
    name, trigger: str(fd, "trigger", 300), steps: str(fd, "steps", 3000), tools: str(fd, "tools", 300),
    timesPerWeek: Math.max(0, Math.min(500, int(fd, "timesPerWeek") ?? 1)),
    minutesEach: Math.max(0, Math.min(600, int(fd, "minutesEach") ?? 10)),
    priority: Math.max(1, Math.min(3, int(fd, "priority") ?? 2)), updatedAt: new Date(),
  };
  const db = await getDb();
  const id = str(fd, "id", 40);
  if (id) await db.update(schema.processes).set(values).where(and(eq(schema.processes.id, id), eq(schema.processes.userId, u.id)));
  else await db.insert(schema.processes).values({ userId: u.id, ...values });
  const all = await db.select({ id: schema.processes.id }).from(schema.processes).where(eq(schema.processes.userId, u.id));
  if (all.length >= 3) await autoComplete(u.id, "processes");
  revalidatePath("/dashboard", "layout");
  return { ok: id ? "Updated." : "Added. Add as many as you like." };
}

export async function deleteProcess(id: string) {
  const u = await requireUser();
  const db = await getDb();
  await db.delete(schema.processes).where(and(eq(schema.processes.id, id), eq(schema.processes.userId, u.id)));
  revalidatePath("/dashboard", "layout");
}

export async function uploadDocument(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload." };
  if (file.size > MAX_BYTES) return { error: "That file is over 10 MB. Please send a smaller one." };
  if (!ALLOWED_MIME.has(file.type)) return { error: "We accept PDF, images, Word, Excel, CSV and text files." };
  const category = ["bank", "invoices", "receipts", "accountant", "ai", "other"].includes(str(fd, "category", 20)) ? str(fd, "category", 20) : "other";
  const storageKey = await saveFile(u.id, Buffer.from(await file.arrayBuffer()));
  const db = await getDb();
  await db.insert(schema.documents).values({
    userId: u.id, filename: file.name.replace(/[^\w.\- ()]/g, "_").slice(0, 120), mime: file.type, size: file.size, category, storageKey, uploadedBy: u.id,
  });
  await autoComplete(u.id, "documents");
  revalidatePath("/dashboard", "layout");
  return { ok: `${file.name} uploaded.` };
}

export async function deleteDocument(id: string) {
  const u = await requireUser();
  const db = await getDb();
  const [d] = await db.delete(schema.documents).where(and(eq(schema.documents.id, id), eq(schema.documents.userId, u.id))).returning();
  if (d) await deleteStored(d.storageKey);
  revalidatePath("/dashboard", "layout");
}

export async function openTicket(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  const subject = str(fd, "subject", 140), body = str(fd, "body", 5000);
  if (!subject || !body) return { error: "Add a subject and a message." };
  const db = await getDb();
  const [t] = await db.insert(schema.tickets).values({ userId: u.id, subject }).returning();
  await db.insert(schema.ticketMessages).values({ ticketId: t.id, authorId: u.id, body });
  await sendEmail(process.env.SUPPORT_EMAIL ?? "info@mtdbackoffice.co.uk", `New support request: ${subject}`, `From ${u.email}\n\n${body}`);
  revalidatePath("/dashboard/support");
  return { ok: "Sent. We usually reply within one working day." };
}

export async function replyTicket(ticketId: string, _: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  const body = str(fd, "body", 5000);
  if (!body) return { error: "Write a message first." };
  const db = await getDb();
  const [t] = await db.select().from(schema.tickets).where(and(eq(schema.tickets.id, ticketId), eq(schema.tickets.userId, u.id)));
  if (!t) return { error: "Request not found." };
  await db.insert(schema.ticketMessages).values({ ticketId, authorId: u.id, body });
  await db.update(schema.tickets).set({ status: "open", lastMessageAt: new Date() }).where(eq(schema.tickets.id, ticketId));
  await sendEmail(process.env.SUPPORT_EMAIL ?? "info@mtdbackoffice.co.uk", `Reply on: ${t.subject}`, `From ${u.email}\n\n${body}`);
  revalidatePath("/dashboard/support");
  return { ok: "Sent." };
}

export async function updateAccount(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  const name = str(fd, "name", 100);
  if (!name) return { error: "Please enter your name." };
  const db = await getDb();
  await db.update(schema.users).set({ name }).where(eq(schema.users.id, u.id));
  revalidatePath("/dashboard", "layout");
  return { ok: "Saved." };
}
