"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { logAudit, requireAdmin } from "@/lib/auth";
import { decrypt, mask } from "@/lib/crypto";
import { ensureAccount, grantProduct, normEmail, sendSetupLink } from "@/lib/customers";
import { sendEmail } from "@/lib/email";
import { emailOk, str, type FormState } from "@/lib/form";
import { isProductKey } from "@/lib/products";

export async function createCustomer(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const email = normEmail(str(fd, "email", 254)), name = str(fd, "name", 100), product = str(fd, "product", 20);
  if (!emailOk(email)) return { error: "Enter a valid email." };
  if (!isProductKey(product)) return { error: "Choose a product." };
  await grantProduct(email, product, "manual");
  const u = await ensureAccount(email, name);
  if (name && !u.name) { const db = await getDb(); await db.update(schema.users).set({ name }).where(eq(schema.users.id, u.id)); }
  if (fd.get("invite") === "on") await sendSetupLink(email, "setup");
  revalidatePath("/admin");
  return { ok: `${email} added${fd.get("invite") === "on" ? " and invited" : ""}.` };
}

export async function addProduct(userId: string, _: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const product = str(fd, "product", 20);
  if (!isProductKey(product)) return { error: "Choose a product." };
  const db = await getDb();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  if (!u) return { error: "Customer not found." };
  await grantProduct(u.email, product, "manual");
  await logAudit(userId, admin.id, `purchase.add:${product}`);
  revalidatePath(`/admin/customers/${userId}`);
  return { ok: "Product added." };
}

export async function resendInvite(userId: string) {
  const admin = await requireAdmin();
  const db = await getDb();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  if (u) { await sendSetupLink(u.email, u.passwordHash ? "reset" : "setup"); await logAudit(userId, admin.id, "invite.resend"); }
}

export async function setTaskStatus(userId: string, productKey: string, taskKey: string, status: "todo" | "in_progress" | "done" | "blocked") {
  const admin = await requireAdmin();
  const db = await getDb();
  await db.update(schema.tasks).set({ status, completedAt: status === "done" ? new Date() : null, updatedAt: new Date() })
    .where(and(eq(schema.tasks.userId, userId), eq(schema.tasks.productKey, productKey), eq(schema.tasks.taskKey, taskKey)));
  await logAudit(userId, admin.id, `task:${productKey}.${taskKey}=${status}`);
  revalidatePath(`/admin/customers/${userId}`);
}

/** Returns UTR/NI in clear text for staff. Every reveal is written to the audit log. */
export async function revealSensitive(userId: string): Promise<{ utr: string; ni: string }> {
  const admin = await requireAdmin();
  const db = await getDb();
  const [b] = await db.select().from(schema.businesses).where(eq(schema.businesses.userId, userId));
  await logAudit(userId, admin.id, "sensitive.reveal");
  return { utr: b?.utrEnc ? decrypt(b.utrEnc) : "", ni: b?.niEnc ? decrypt(b.niEnc) : "" };
}
export async function maskedSensitive(userId: string) {
  await requireAdmin();
  const db = await getDb();
  const [b] = await db.select().from(schema.businesses).where(eq(schema.businesses.userId, userId));
  return { utr: b?.utrEnc ? mask(decrypt(b.utrEnc)) : "", ni: b?.niEnc ? mask(decrypt(b.niEnc)) : "" };
}

export async function staffReply(ticketId: string, _: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const body = str(fd, "body", 5000);
  if (!body) return { error: "Write a message first." };
  const db = await getDb();
  const [t] = await db.select().from(schema.tickets).where(eq(schema.tickets.id, ticketId));
  if (!t) return { error: "Not found." };
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, t.userId));
  await db.insert(schema.ticketMessages).values({ ticketId, authorId: admin.id, fromStaff: true, body });
  await db.update(schema.tickets).set({ lastMessageAt: new Date(), status: fd.get("close") === "on" ? "closed" : "open" }).where(eq(schema.tickets.id, ticketId));
  await sendEmail(u.email, `Re: ${t.subject}`, `${body}\n\n—\nYou can reply from your dashboard: ${process.env.APP_URL ?? ""}/dashboard/support`);
  revalidatePath(`/admin/customers/${t.userId}`);
  return { ok: "Reply sent." };
}
