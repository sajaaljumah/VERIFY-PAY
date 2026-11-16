import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Problem } from "./problem";

const BUCKET_NAME = "verify-pay-receipts";
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];

let client: SupabaseClient | undefined;
let bucketReady: Promise<void> | undefined;

export function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1";
}

function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const projectUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!projectUrl || !serviceRoleKey) {
    throw new Problem(503, "Receipt storage is not configured for this deployment.");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(projectUrl);
  } catch {
    throw new Problem(503, "Receipt storage is not configured for this deployment.");
  }
  if (parsedUrl.protocol !== "https:" || !parsedUrl.hostname.endsWith(".supabase.co")) {
    throw new Problem(503, "Receipt storage is not configured for this deployment.");
  }

  client = createClient(projectUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  return client;
}

function storagePathFromObjectPath(objectPath: string): string {
  const match = objectPath.match(/^\/objects\/(uploads|receipts)\/([a-f0-9-]{36})$/);
  if (!match) throw new Problem(400, "Invalid receipt object path.");
  return `${match[1]}/${match[2]}`;
}

function storageUnavailable(): Problem {
  return new Problem(503, "Receipt storage is temporarily unavailable. Please try again.");
}

function responseStatus(error: { statusCode?: string | number }): number | undefined {
  const status = Number(error.statusCode);
  return Number.isInteger(status) ? status : undefined;
}

async function ensurePrivateBucket(): Promise<void> {
  if (!bucketReady) {
    bucketReady = (async () => {
      const storage = getSupabaseClient().storage;
      const existing = await storage.getBucket(BUCKET_NAME);
      if (!existing.error) {
        if (existing.data.public) {
          throw new Error("Receipt bucket must remain private.");
        }
        return;
      }

      if (responseStatus(existing.error) !== 404) {
        throw new Error("Could not check the private receipt bucket.");
      }

      const created = await storage.createBucket(BUCKET_NAME, {
        public: false,
        fileSizeLimit: MAX_RECEIPT_BYTES,
        allowedMimeTypes: ALLOWED_MIME_TYPES,
      });
      if (created.error) {
        if (responseStatus(created.error) !== 409) {
          throw new Error("Could not create the private receipt bucket.");
        }
        const concurrentBucket = await storage.getBucket(BUCKET_NAME);
        if (concurrentBucket.error || concurrentBucket.data.public) {
          throw new Error("Receipt bucket must remain private.");
        }
      }
    })();
  }

  try {
    await bucketReady;
  } catch {
    bucketReady = undefined;
    throw storageUnavailable();
  }
}

export async function createSupabaseReceiptUpload(): Promise<{
  uploadURL: string;
  objectPath: string;
}> {
  await ensurePrivateBucket();
  const objectPath = `/objects/uploads/${randomUUID()}`;
  const storagePath = storagePathFromObjectPath(objectPath);
  const { data, error } = await getSupabaseClient()
    .storage.from(BUCKET_NAME)
    .createSignedUploadUrl(storagePath, { upsert: false });
  if (error || !data?.signedUrl) throw storageUnavailable();

  const projectUrl = process.env.SUPABASE_URL!;
  return {
    uploadURL: new URL(data.signedUrl, projectUrl).toString(),
    objectPath,
  };
}

export async function readSupabaseReceipt(objectPath: string): Promise<Buffer> {
  await ensurePrivateBucket();
  const storagePath = storagePathFromObjectPath(objectPath);
  const { data, error } = await getSupabaseClient()
    .storage.from(BUCKET_NAME)
    .download(storagePath);
  if (error || !data) throw storageUnavailable();
  if (data.size > MAX_RECEIPT_BYTES) {
    throw new Problem(400, "Receipt exceeds the 10 MB limit.");
  }
  return Buffer.from(await data.arrayBuffer());
}

export async function writeSupabaseReceipt(
  objectPath: string,
  bytes: Buffer,
  contentType: string,
): Promise<void> {
  if (bytes.length > MAX_RECEIPT_BYTES) {
    throw new Problem(400, "Receipt exceeds the 10 MB limit.");
  }
  if (!ALLOWED_MIME_TYPES.includes(contentType)) {
    throw new Problem(400, "Only valid JPG, PNG, and PDF receipts are supported.");
  }

  await ensurePrivateBucket();
  const storagePath = storagePathFromObjectPath(objectPath);
  const { error } = await getSupabaseClient()
    .storage.from(BUCKET_NAME)
    .upload(storagePath, new Uint8Array(bytes), {
      cacheControl: "0",
      contentType,
      upsert: false,
    });
  if (error) throw storageUnavailable();
}

export async function createSupabaseReceiptDownloadUrl(
  objectPath: string,
  fileName: string,
): Promise<string> {
  await ensurePrivateBucket();
  const storagePath = storagePathFromObjectPath(objectPath);
  const { data, error } = await getSupabaseClient()
    .storage.from(BUCKET_NAME)
    .createSignedUrl(storagePath, 120, { download: fileName });
  if (error || !data?.signedUrl) throw storageUnavailable();

  const projectUrl = process.env.SUPABASE_URL!;
  return new URL(data.signedUrl, projectUrl).toString();
}
