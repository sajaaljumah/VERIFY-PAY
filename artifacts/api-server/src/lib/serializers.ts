import { db, receipts, bankTransactions, type PaymentRow, type ReceiptRow, type BankRow, type AttemptRow } from "@workspace/db";
import { eq, and, ne } from "drizzle-orm";

export const bankJson = (r: BankRow) => ({
  id: r.id, transactionId: r.transactionId, reference: r.reference, amount: r.amountFils / 1000,
  date: r.date, description: r.description, sender: r.sender, matchedPaymentId: r.matchedPaymentId, importedAt: r.importedAt.toISOString(),
});
export async function paymentJson(r: PaymentRow) {
  const own = await db.select({ id: receipts.id }).from(receipts).where(and(eq(receipts.paymentId, r.id), eq(receipts.businessId, r.businessId)));
  return { id: r.id, reference: r.reference, customerName: r.customerName, orderId: r.orderId,
    amount: r.amountFils / 1000, description: r.description, currency: "KWD", status: r.status, createdAt: r.createdAt.toISOString(), receiptCount: own.length };
}
export async function receiptJson(r: ReceiptRow) {
  const dup = r.fileHash ? await db.select({ id: receipts.id }).from(receipts).where(and(eq(receipts.businessId, r.businessId), eq(receipts.fileHash, r.fileHash), ne(receipts.paymentId, r.paymentId))).limit(1) : [];
  return { id: r.id, paymentId: r.paymentId, fileName: r.fileName, contentType: r.contentType, createdAt: r.createdAt.toISOString(),
    confidence: r.confidence, extractionNote: r.extractionNote, duplicateFile: dup.length > 0,
    fileUrl: `/api/vp/receipts/${r.id}/file`, amount: r.amountFils === null ? null : r.amountFils / 1000,
    transactionDate: r.transactionDate, reference: r.reference, sender: r.sender, receiver: r.receiver };
}
export async function attemptJson(r: AttemptRow) {
  const bank = r.bankTransactionId ? (await db.select().from(bankTransactions).where(and(eq(bankTransactions.id, r.bankTransactionId), eq(bankTransactions.businessId, r.businessId))))[0] : null;
  return { id: r.id, paymentId: r.paymentId, receiptId: r.receiptId, customerName: r.customerName, orderId: r.orderId,
    reference: r.reference, amount: r.amountFils / 1000, status: r.status, reason: r.reason,
    createdAt: r.createdAt.toISOString(), checks: r.checks, matchedTransaction: bank ? bankJson(bank) : null };
}
