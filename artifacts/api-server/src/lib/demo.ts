import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, payments, receipts, bankTransactions, bankImports, attempts, type PaymentRow, type BankRow } from "@workspace/db";
import { evaluateReceipt } from "./verification";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
const customers = ["Mariam Al-Sabah", "Ahmad Al-Mutairi", "Noura Al-Ajmi", "Yousef Al-Rashidi", "Fatima Al-Kandari", "Khaled Al-Dosari", "Sara Al-Hajri", "Abdullah Al-Enezi", "Dana Al-Fahad", "Omar Al-Shammari"];
export const demoAmounts = [85, 125.5, 32, 245, 68.75, 150, 45, 92.25, 18.5, 210];
const descriptions = ["Custom gift box · Eid collection", "Handcrafted home decor", "Scented candle set", "Corporate gifting order", "Personalized gift hamper", "Weekend collection order", "Ceramic coffee set", "Premium oud collection", "Gift wrapping service", "Bespoke home accessories"];
const daysAgo = (days: number) => new Date(Date.now() - days * 86400000);
export async function seedDemo(tx: Tx, businessId: string) {
  const requests: PaymentRow[] = [];
  for (let i = 0; i < 10; i++) {
    const [payment] = await tx.insert(payments).values({
      id: randomUUID(), businessId, reference: `VP-${randomUUID().slice(0, 8).toUpperCase()}`,
      customerName: customers[i], orderId: `ORD-${1041 + i}`, amountFils: Math.round(demoAmounts[i] * 1000),
      description: descriptions[i], createdAt: daysAgo(9 - i),
    }).returning();
    requests.push(payment!);
  }
  const bank: BankRow[] = [];
  for (let i = 0; i < 12; i++) {
    const pi = [0, 1, 2, 3, 4, 7, 9][i];
    const payment = pi !== undefined ? requests[pi] : undefined;
    const [b] = await tx.insert(bankTransactions).values({
      id: randomUUID(), businessId, transactionId: `DEMO${700100 + i}`,
      reference: payment ? `KWT${900101 + pi}` : `KWT${990000 + i}`,
      amountFils: pi === 7 ? 80000 : payment?.amountFils ?? (i + 1) * 13500,
      date: payment ? payment.createdAt.toISOString().slice(0, 10) : daysAgo(i % 7).toISOString().slice(0, 10),
      description: payment?.description ?? "Incoming transfer · sample bank record", sender: payment?.customerName ?? `Sample customer ${i}`,
      importedAt: daysAgo(0),
    }).returning();
    bank.push(b!);
  }
  await tx.insert(bankImports).values({ id: randomUUID(), businessId, fileName: "demo-bank-statement.csv", imported: 12, duplicates: 0, rejected: 0, errors: [] });
  for (const i of [0, 1, 2, 3, 7, 8, 9]) {
    const p = requests[i]!;
    const [r] = await tx.insert(receipts).values({
      id: randomUUID(), businessId, paymentId: p.id, objectPath: `demo:${p.id}`, fileName: `demo-receipt-${p.orderId}.pdf`,
      contentType: "application/pdf", expectedSize: 1, fileHash: `demo-${i}`, amountFils: i === 8 ? requests[0]!.amountFils : p.amountFils,
      transactionDate: i === 8 ? requests[0]!.createdAt.toISOString().slice(0, 10) : p.createdAt.toISOString().slice(0, 10),
      reference: i === 9 ? "" : `KWT${900101 + (i === 8 ? 0 : i)}`,
      sender: i === 8 ? requests[0]!.customerName : p.customerName, receiver: "Bayt Studio", confidence: "high",
      extractionNote: "Illustrative demo receipt. No real payment is represented.", createdAt: p.createdAt,
    }).returning();
    const evaluation = evaluateReceipt(p, r!, bank, false);
    if (evaluation.status === "VERIFIED" && evaluation.candidate) {
      evaluation.candidate.matchedPaymentId = p.id;
      await tx.update(bankTransactions).set({ matchedPaymentId: p.id }).where(eq(bankTransactions.id, evaluation.candidate.id));
    }
    await tx.update(payments).set({ status: evaluation.status }).where(eq(payments.id, p.id));
    await tx.insert(attempts).values({
      id: randomUUID(), businessId, paymentId: p.id, receiptId: r!.id, bankTransactionId: evaluation.candidate?.id,
      customerName: p.customerName, orderId: p.orderId, reference: r!.reference, amountFils: r!.amountFils ?? 0,
      status: evaluation.status, reason: evaluation.reason, checks: evaluation.checks,
      reviewedFields: { amount: (r!.amountFils ?? 0) / 1000, transactionDate: r!.transactionDate, reference: r!.reference, sender: r!.sender, receiver: r!.receiver }, createdAt: p.createdAt,
    });
  }
}
