import { randomUUID, createHash } from "node:crypto";
import { db, receipts, type ReceiptRow } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { ObjectStorageService, signObjectURL } from "./objectStorage";
import { Problem } from "./problem";
import {
  createSupabaseReceiptDownloadUrl,
  createSupabaseReceiptUpload,
  isVercelRuntime,
  readSupabaseReceipt,
  writeSupabaseReceipt,
} from "./supabaseStorage";

export const storage = new ObjectStorageService();
const MAX = 10 * 1024 * 1024;
export async function createReceiptUpload(): Promise<{ uploadURL: string; objectPath: string }> {
  if (isVercelRuntime()) return createSupabaseReceiptUpload();
  const uploadURL = await storage.getObjectEntityUploadURL();
  return { uploadURL, objectPath: storage.normalizeObjectEntityPath(uploadURL) };
}

export async function createReceiptDownloadUrl(path: string, fileName: string): Promise<string | null> {
  if (!isVercelRuntime()) return null;
  return createSupabaseReceiptDownloadUrl(path, fileName);
}

async function signedPrivateObject(path: string, method: "GET" | "PUT") {
  if (!/^\/objects\/(?:uploads|receipts)\/[a-f0-9-]{36}$/.test(path)) throw new Problem(400, "Invalid receipt object path.");
  const parts = storage.getPrivateObjectDir().replace(/^\//, "").split("/");
  const bucketName = parts.shift()!;
  const objectName = `${parts.join("/")}/${path.slice("/objects/".length)}`;
  return signObjectURL({ bucketName, objectName, method, ttlSec: 120 });
}
export async function readObject(path: string): Promise<Buffer> {
  if (isVercelRuntime()) return readSupabaseReceipt(path);
  // Signed HTTP reads use the same Replit sidecar as direct uploads; no
  // application-managed Google credentials or project-ID discovery is needed.
  const url = await signedPrivateObject(path, "GET");
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok || !response.body) throw new Problem(400, "Upload has not completed or the file is unavailable. Upload the receipt again.");
  if (Number(response.headers.get("content-length")) > MAX) { await response.body.cancel(); throw new Problem(400, "Receipt exceeds the 10 MB limit."); }
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of response.body) {
    const b = Buffer.from(chunk); length += b.length;
    if (length > MAX) throw new Problem(400, "Receipt exceeds the 10 MB limit.");
    chunks.push(b);
  }
  return Buffer.concat(chunks);
}

async function writeObject(path: string, bytes: Buffer, mime: string): Promise<void> {
  if (isVercelRuntime()) {
    await writeSupabaseReceipt(path, bytes, mime);
    return;
  }
  const put = await fetch(await signedPrivateObject(path, "PUT"), {
    method: "PUT",
    body: bytes,
    headers: { "Content-Type": mime, "Cache-Control": "private, no-store" },
    signal: AbortSignal.timeout(30000),
  });
  if (!put.ok) throw new Problem(503, "Could not save the receipt securely. Please try again.");
}
export function detectMime(bytes: Buffer): string | null {
  if (bytes.subarray(0, 5).toString() === "%PDF-") return "application/pdf";
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  return null;
}
// Move staged uploads to a server-owned immutable location. Reusing an unexpired
// signed PUT URL can then never replace bytes already used in a verification.
export async function freezeReceipt(receipt: ReceiptRow): Promise<{ receipt: ReceiptRow; bytes: Buffer }> {
  if (receipt.objectPath.startsWith("demo:")) throw new Problem(400, "Upload a new receipt to run a new verification.");
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${receipt.id}))`);
    const [current] = await tx.select().from(receipts).where(eq(receipts.id, receipt.id));
    if (!current) throw new Problem(404, "Receipt not found.");
    const bytes = await readObject(current.objectPath).catch((e: unknown) => {
      if (e instanceof Problem) throw e;
      throw new Problem(400, "Upload has not completed or the file is unavailable. Upload the receipt again.");
    });
    const mime = detectMime(bytes);
    if (mime !== current.contentType || bytes.length !== current.expectedSize) throw new Problem(400, "File contents or size do not match the upload. Only valid JPG, PNG, and PDF receipts are supported.");
    if (current.fileHash) return { receipt: current, bytes };
    const objectPath = `/objects/receipts/${randomUUID()}`;
    await writeObject(objectPath, bytes, mime);
    const [saved] = await tx.update(receipts).set({ objectPath, fileHash: createHash("sha256").update(bytes).digest("hex") }).where(eq(receipts.id, current.id)).returning();
    return { receipt: saved!, bytes };
  });
}
