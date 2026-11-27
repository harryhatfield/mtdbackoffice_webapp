import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// Swap this module for S3 / Cloudflare R2 if you deploy somewhere without a persistent disk.
const root = () => path.resolve(process.env.STORAGE_DIR ?? ".data/uploads");

export const MAX_BYTES = 10 * 1024 * 1024;
export const ALLOWED_MIME = new Set([
  "application/pdf", "image/png", "image/jpeg", "image/webp", "text/plain", "text/csv",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export async function saveFile(userId: string, data: Buffer): Promise<string> {
  const key = `${userId}/${randomUUID()}`;
  const full = path.join(root(), key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
  return key;
}
const safe = (key: string) => {
  const full = path.resolve(root(), key);
  if (!full.startsWith(root() + path.sep)) throw new Error("bad key");
  return full;
};
export const readStored = (key: string) => readFile(safe(key));
export const deleteStored = (key: string) => unlink(safe(key)).catch(() => {});
