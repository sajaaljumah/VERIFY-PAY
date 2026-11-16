import { Router, type IRouter } from "express";
import { rateLimit } from "express-rate-limit";
import { randomUUID } from "node:crypto";
import { eq, and, ne, sql } from "drizzle-orm";
import { db, receipts, payments, bankTransactions, attempts } from "@workspace/db";
import { RequestReceiptUploadBody, RequestReceiptUploadResponse, ExtractReceiptParams, ExtractReceiptResponse, VerifyReceiptParams, VerifyReceiptBody, VerifyReceiptResponse, GetPaymentParams } from "@workspace/api-zod";
import { Problem } from "../lib/problem";
import { storage, freezeReceipt, readObject } from "../lib/receipt-files";
import { extractFields } from "../lib/ocr";
import { isValidDate, toFils } from "../lib/money";
import { evaluateReceipt } from "../lib/verification";
import { attemptJson, receiptJson } from "../lib/serializers";
import { sampleReceipt } from "../lib/sample-receipt";

const router: IRouter = Router();
const ocrLimiter = rateLimit({ windowMs: 60 * 1000, limit: 6, keyGenerator: (req) => req.businessId, standardHeaders: "draft-7", legacyHeaders: false, message: { error: "Too many extraction requests. Please wait a minute." } });
router.post("/receipts/upload-url", async (req, res): Promise<void> => {
  const body = RequestReceiptUploadBody.parse(req.body);
  const [p] = await db.select().from(payments).where(and(eq(payments.id, body.paymentId), eq(payments.businessId, req.businessId)));
  if (!p) throw new Problem(404, "Payment request not found.");
  const existing = await db.select({ id: receipts.id }).from(receipts).where(eq(receipts.businessId, req.businessId));
  if (existing.length >= (req.isDemo ? 50 : 5000)) throw new Problem(400, "Receipt limit for this workspace has been reached.");
  const uploadURL = await storage.getObjectEntityUploadURL();
  const receiptId = randomUUID();
  await db.insert(receipts).values({
    id: receiptId, businessId: req.businessId, paymentId: body.paymentId,
    objectPath: storage.normalizeObjectEntityPath(uploadURL), fileName: body.name, contentType: body.contentType, expectedSize: body.size,
  });
  res.status(201).json(RequestReceiptUploadResponse.parse({ receiptId, uploadURL }));
});
router.post("/receipts/:id/extract", ocrLimiter, async (req, res): Promise<void> => {
  const { id } = ExtractReceiptParams.parse(req.params);
  const [found] = await db.select().from(receipts).where(and(eq(receipts.id, id), eq(receipts.businessId, req.businessId)));
  if (!found) throw new Problem(404, "Receipt not found.");
  if (found.confidence !== "unprocessed") { res.json(ExtractReceiptResponse.parse(await receiptJson(found))); return; }
  const { receipt, bytes } = await freezeReceipt(found);
  let fields;
  try { fields = await extractFields(receipt, bytes); }
  catch (e) {
    const providerError = e as { status?: number; code?: string };
    req.log.warn({ receiptId: id, errorType: e instanceof Error ? e.name : "unknown", status: providerError.status, code: providerError.code }, "Receipt extraction failed");
    const note = providerError.code === "invalid_api_key"
      ? "OpenAI rejected the configured API key. The workspace owner must replace OPENAI_API_KEY in Secrets to enable automatic extraction."
      : providerError.code === "insufficient_quota"
        ? "The OpenAI account has no available API quota. Update the provider account to enable automatic extraction."
        : "Automatic extraction could not be completed.";
    fields = { confidence: "unprocessed", extractionNote: `${note} Enter and review transaction details manually before matching against imported records.` };
  }
  const [updated] = await db.update(receipts).set(fields).where(and(eq(receipts.id, id), eq(receipts.businessId, req.businessId))).returning();
  res.json(ExtractReceiptResponse.parse(await receiptJson(updated!)));
});
router.post("/receipts/:id/verify", async (req, res): Promise<void> => {
  const { id } = VerifyReceiptParams.parse(req.params);
  const body = VerifyReceiptBody.parse(req.body);
  if (body.transactionDate && !isValidDate(body.transactionDate)) throw new Problem(400, "Enter a valid transaction date in YYYY-MM-DD format, or leave it empty for manual review.");
  const amountFils = body.amount === null ? null : toFils(body.amount);
  const [found] = await db.select().from(receipts).where(and(eq(receipts.id, id), eq(receipts.businessId, req.businessId)));
  if (!found) throw new Problem(404, "Receipt not found.");
  await freezeReceipt(found);
  const attempt = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${req.businessId}))`);
    const [r] = await tx.update(receipts).set({ amountFils, transactionDate: body.transactionDate, reference: body.reference.trim(), sender: body.sender.trim(), receiver: body.receiver.trim() }).where(and(eq(receipts.id, id), eq(receipts.businessId, req.businessId))).returning();
    const [p] = await tx.select().from(payments).where(and(eq(payments.id, r!.paymentId), eq(payments.businessId, req.businessId)));
    if (!p) throw new Problem(404, "Payment request not found.");
    const bank = await tx.select().from(bankTransactions).where(eq(bankTransactions.businessId, req.businessId));
    const dup = r!.fileHash ? await tx.select({ id: receipts.id }).from(receipts).where(and(eq(receipts.businessId, req.businessId), eq(receipts.fileHash, r!.fileHash), ne(receipts.paymentId, p.id))).limit(1) : [];
    const evaluation = evaluateReceipt(p, r!, bank, dup.length > 0);
    // Already verified payments retain their legitimate bank match even if a later
    // upload is bad; the new attempt still records its actual failure status.
    if (evaluation.status === "VERIFIED") {
      await tx.update(bankTransactions).set({ matchedPaymentId: p.id }).where(and(eq(bankTransactions.id, evaluation.candidate!.id), eq(bankTransactions.businessId, req.businessId)));
    }
    if (p.status !== "VERIFIED") await tx.update(payments).set({ status: evaluation.status }).where(eq(payments.id, p.id));
    const [a] = await tx.insert(attempts).values({
      id: randomUUID(), businessId: req.businessId, paymentId: p.id, receiptId: id,
      bankTransactionId: evaluation.candidate?.id, customerName: p.customerName, orderId: p.orderId,
      reference: body.reference, amountFils: amountFils ?? 0, status: evaluation.status, reason: evaluation.reason,
      checks: evaluation.checks, reviewedFields: body,
    }).returning();
    return a!;
  });
  res.json(VerifyReceiptResponse.parse(await attemptJson(attempt)));
});
router.get("/receipts/:id/file", async (req, res): Promise<void> => {
  const { id } = ExtractReceiptParams.parse(req.params);
  const [r] = await db.select().from(receipts).where(and(eq(receipts.id, id), eq(receipts.businessId, req.businessId)));
  if (!r) throw new Problem(404, "Receipt not found.");
  if (r.objectPath.startsWith("demo:") && req.isDemo) {
    const [p] = await db.select().from(payments).where(and(eq(payments.id, r.paymentId), eq(payments.businessId, req.businessId)));
    if (!p) throw new Problem(404, "Payment not found.");
    sampleReceipt(res, p, r); return;
  }
  const bytes = await readObject(r.objectPath);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.attachment(r.fileName).type(r.contentType).send(bytes);
});
router.get("/sample-receipt.pdf", async (req, res): Promise<void> => {
  if (!req.isDemo) throw new Problem(400, "Sample receipts are available only in the demo workspace.");
  const { id } = GetPaymentParams.parse({ id: req.query.paymentId });
  const [p] = await db.select().from(payments).where(and(eq(payments.id, id), eq(payments.businessId, req.businessId)));
  if (!p) throw new Problem(404, "Payment request not found.");
  sampleReceipt(res, p);
});
export default router;
