"use server";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { authenticate, createSession, destroySession, loginAllowed, recordFailure } from "@/lib/auth";
import { hashPassword, sha256 } from "@/lib/crypto";
import { normEmail, sendSetupLink } from "@/lib/customers";
import { emailOk, str, type FormState } from "@/lib/form";

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const email = normEmail(str(fd, "email", 254));
  const password = String(fd.get("password") ?? "");
  if (!emailOk(email) || !password) return { error: "Enter your email and password." };
  if (!(await loginAllowed(email))) return { error: "Too many attempts. Please wait 15 minutes and try again." };
  const id = await authenticate(email, password);
  if (!id) {
    await recordFailure(email);
    return { error: "That email and password don't match. Forgotten it? Use the link below." };
  }
  await createSession(id);
  const db = await getDb();
  const [u] = await db.select({ role: schema.users.role }).from(schema.users).where(eq(schema.users.id, id));
  redirect(u.role === "admin" ? "/admin" : "/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

/** Used for both "activate my account" and "forgot password". Never reveals whether an email is known. */
export async function requestLink(kind: "setup" | "reset", _: FormState, fd: FormData): Promise<FormState> {
  const email = normEmail(str(fd, "email", 254));
  if (!emailOk(email)) return { error: "Please enter a valid email address." };
  if (!(await loginAllowed(`link:${email}`))) return { error: "Too many requests. Please wait 15 minutes." };
  await recordFailure(`link:${email}`); // counts requests so the link can't be spammed
  await sendSetupLink(email, kind);
  return { ok: "If that email matches a purchase or account, we've sent a link. Check your inbox (and spam)." };
}
export const requestActivation = requestLink.bind(null, "setup");
export const requestReset = requestLink.bind(null, "reset");

export async function setPassword(_: FormState, fd: FormData): Promise<FormState> {
  const token = str(fd, "token", 100);
  const pw = String(fd.get("password") ?? "");
  const pw2 = String(fd.get("confirm") ?? "");
  if (pw.length < 10) return { error: "Use at least 10 characters. A few random words works well." };
  if (pw.length > 200) return { error: "That password is too long." };
  if (pw !== pw2) return { error: "The two passwords don't match." };
  const db = await getDb();
  const [t] = await db.select().from(schema.authTokens).where(and(
    eq(schema.authTokens.tokenHash, sha256(token)), isNull(schema.authTokens.usedAt), gt(schema.authTokens.expiresAt, new Date())));
  if (!t) return { error: "This link has expired or already been used. Request a new one." };
  await db.update(schema.authTokens).set({ usedAt: new Date() }).where(eq(schema.authTokens.id, t.id));
  await db.update(schema.users).set({ passwordHash: await hashPassword(pw) }).where(eq(schema.users.id, t.userId));
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, t.userId)); // sign out everywhere
  await createSession(t.userId);
  redirect("/dashboard");
}
