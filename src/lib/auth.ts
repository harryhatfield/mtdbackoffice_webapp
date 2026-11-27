import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, count } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { newToken, sha256, verifyPassword } from "./crypto";

const COOKIE = "mtd_session";
const SESSION_DAYS = 30;
const MAX_FAILS = 8;
const WINDOW_MIN = 15;

export type SessionUser = { id: string; email: string; name: string; role: "customer" | "admin" };

export async function createSession(userId: string) {
  const db = await getDb();
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  const ua = (await headers()).get("user-agent")?.slice(0, 200) ?? null;
  await db.insert(schema.sessions).values({ userId, tokenHash: sha256(token), userAgent: ua, expiresAt });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(schema.sessions).where(eq(schema.sessions.tokenHash, sha256(token)));
  }
  jar.delete(COOKIE);
}

export async function getUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const [row] = await db
    .select({ id: schema.users.id, email: schema.users.email, name: schema.users.name, role: schema.users.role })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.tokenHash, sha256(token)), gt(schema.sessions.expiresAt, new Date())));
  return row ?? null;
}

export async function requireUser(): Promise<SessionUser> {
  const u = await getUser();
  if (!u) redirect("/login");
  return u;
}
export async function requireAdmin(): Promise<SessionUser> {
  const u = await requireUser();
  if (u.role !== "admin") redirect("/dashboard");
  return u;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

/** Returns true if allowed. Failed attempts are keyed by email and by IP. */
export async function loginAllowed(email: string): Promise<boolean> {
  const db = await getDb();
  const since = new Date(Date.now() - WINDOW_MIN * 60_000);
  const ip = await clientIp();
  for (const key of [`e:${email}`, `ip:${ip}`]) {
    const [r] = await db.select({ n: count() }).from(schema.loginAttempts)
      .where(and(eq(schema.loginAttempts.key, key), gt(schema.loginAttempts.createdAt, since)));
    if (r.n >= MAX_FAILS * (key.startsWith("ip:") ? 3 : 1)) return false;
  }
  return true;
}
export async function recordFailure(email: string) {
  const db = await getDb();
  const ip = await clientIp();
  await db.insert(schema.loginAttempts).values([{ key: `e:${email}` }, { key: `ip:${ip}` }]);
}

export async function authenticate(email: string, password: string): Promise<string | null> {
  const db = await getDb();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  const ok = await verifyPassword(password, u?.passwordHash ?? null);
  return ok && u ? u.id : null;
}

export async function logAudit(userId: string | null, actorId: string | null, action: string) {
  const db = await getDb();
  await db.insert(schema.auditLog).values({ userId, actorId, action });
}
