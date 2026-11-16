import type { BankRow, Check, PaymentRow, ReceiptRow } from "@workspace/db";
import { isValidDate, normalizedReference } from "./money";

export const sourceDisclaimer = "Matched to records in your imported bank file only. This does not authenticate the receipt or independently confirm bank settlement.";
export function evaluateReceipt(payment: PaymentRow, receipt: ReceiptRow, bank: BankRow[], duplicateFile: boolean) {
  const reference = normalizedReference(receipt.reference);
  const found = reference ? bank.filter((b) => b.reference === reference || b.transactionId === reference) : [];
  const candidate = found.length === 1 ? found[0] : undefined;
  const amountMatches = receipt.amountFils !== null && receipt.amountFils === payment.amountFils;
  const hasDate = isValidDate(receipt.transactionDate);
  const requestDay = new Date(payment.createdAt).toISOString().slice(0, 10);
  const delta = candidate && hasDate
    ? Math.abs(new Date(candidate.date).getTime() - new Date(receipt.transactionDate).getTime()) / 86400000 : null;
  const futureDate = hasDate && receipt.transactionDate > new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const predatesRequest = hasDate && new Date(receipt.transactionDate).getTime() < new Date(requestDay).getTime() - 7 * 86400000;
  const reusedTransaction = candidate?.matchedPaymentId != null && candidate.matchedPaymentId !== payment.id;
  const checks: Check[] = [
    { label: "Imported bank record", passed: candidate ? true : null, detail: candidate ? `Reference matches imported transaction ${candidate.transactionId}.` : found.length > 1 ? "Ambiguous reference: multiple records match." : "No uniquely referenced bank record found." },
    { label: "Expected amount", passed: receipt.amountFils === null ? null : amountMatches, detail: receipt.amountFils === null ? "Receipt amount is missing." : `Expected ${(payment.amountFils / 1000).toFixed(3)} KWD; receipt ${(receipt.amountFils / 1000).toFixed(3)} KWD.` },
    { label: "Bank amount", passed: candidate && receipt.amountFils !== null ? candidate.amountFils === receipt.amountFils : null, detail: candidate ? `Imported amount ${(candidate.amountFils / 1000).toFixed(3)} KWD.` : "Waiting for a uniquely referenced imported record." },
    { label: "Transaction date", passed: candidate && hasDate ? delta! <= 3 && !futureDate && !predatesRequest : null, detail: !hasDate ? "A valid date is required for automatic matching." : futureDate ? "Receipt date is in the future." : predatesRequest ? "Receipt date substantially predates this request." : delta === null ? "No bank date to compare." : `Receipt and imported bank dates are ${delta} day(s) apart; allowed window is 3 days.` },
    { label: "Duplicate protection", passed: !duplicateFile && !reusedTransaction, detail: duplicateFile ? "Identical receipt bytes were uploaded for another payment." : reusedTransaction ? "The referenced bank transaction is already assigned to another payment." : "No reused receipt or transaction found." },
  ];
  let status: string;
  let reason: string;
  if (duplicateFile || reusedTransaction) {
    status = "DUPLICATE";
    reason = duplicateFile ? "This receipt file was already used for another payment request." : "This bank transaction is already matched to a different payment request.";
  } else if (receipt.amountFils !== null && !amountMatches) {
    status = "MISMATCH"; reason = "The receipt amount does not equal the payment request amount.";
  } else if (candidate && receipt.amountFils !== null && candidate.amountFils !== receipt.amountFils) {
    status = "MISMATCH"; reason = "The receipt amount differs from the imported transaction amount.";
  } else if (candidate && hasDate && (delta! > 3 || futureDate || predatesRequest)) {
    status = "MISMATCH"; reason = "The transaction date falls outside the permitted matching window.";
  } else if (!receipt.amountFils || !hasDate || !reference || found.length > 1 || (candidate && payment.status === "VERIFIED" && candidate.matchedPaymentId !== payment.id)) {
    status = "MANUAL_REVIEW"; reason = "Insufficient or ambiguous transaction details. Review the receipt and imported bank records; amount alone is not enough.";
  } else if (!candidate) {
    const near = bank.some((b) => b.amountFils === receipt.amountFils && Math.abs(new Date(b.date).getTime() - new Date(receipt.transactionDate).getTime()) <= 3 * 86400000);
    status = near ? "MANUAL_REVIEW" : "PENDING";
    reason = near ? "A similar amount/date exists, but its reference does not match. It has not been verified." : "No matching imported transaction found yet. Import newer bank records and try again.";
  } else {
    status = "VERIFIED"; reason = sourceDisclaimer;
  }
  return { status, reason, checks, candidate };
}
