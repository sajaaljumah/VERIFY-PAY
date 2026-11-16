import { db, payments, bankTransactions, attempts, bankImports } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { paymentJson, attemptJson } from "./serializers";

export async function dashboard(businessId: string) {
  const [ps, bs, ats] = await Promise.all([
    db.select().from(payments).where(eq(payments.businessId, businessId)).orderBy(desc(payments.createdAt)),
    db.select().from(bankTransactions).where(eq(bankTransactions.businessId, businessId)),
    db.select().from(attempts).where(eq(attempts.businessId, businessId)).orderBy(desc(attempts.createdAt)),
  ]);
  const statuses = ["VERIFIED", "PENDING", "MISMATCH", "DUPLICATE", "MANUAL_REVIEW"];
  const statusBreakdown = statuses.map((status) => {
    const rows = ps.filter((p) => p.status === status);
    return { status, count: rows.length, amount: rows.reduce((sum, p) => sum + p.amountFils, 0) / 1000 };
  });
  const trend = Array.from({ length: 14 }, (_, i) => {
    const date = new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10);
    const rows = ps.filter((p) => p.createdAt.toISOString().slice(0, 10) === date);
    return { date, verified: rows.filter((p) => p.status === "VERIFIED").reduce((sum, p) => sum + p.amountFils, 0) / 1000,
      pending: rows.filter((p) => p.status === "PENDING").reduce((sum, p) => sum + p.amountFils, 0) / 1000 };
  });
  const count = (s: string) => ps.filter((p) => p.status === s).length;
  return {
    totalRequests: ps.length, verifiedPayments: count("VERIFIED"), pendingPayments: count("PENDING"),
    mismatchedPayments: count("MISMATCH"), duplicateAttempts: ats.filter((a) => a.status === "DUPLICATE").length,
    manualReview: count("MANUAL_REVIEW"), totalVerifiedAmount: statusBreakdown[0]!.amount,
    totalRequestedAmount: ps.reduce((sum, p) => sum + p.amountFils, 0) / 1000,
    bankRecordCount: bs.length, unmatchedBankCount: bs.filter((b) => !b.matchedPaymentId).length,
    statusBreakdown, trend, recentPayments: await Promise.all(ps.slice(0, 6).map(paymentJson)),
    recentActivity: await Promise.all(ats.slice(0, 6).map(attemptJson)),
  };
}
export async function report(businessId: string) {
  const [summary, rows, imports] = await Promise.all([
    dashboard(businessId),
    db.select().from(attempts).where(eq(attempts.businessId, businessId)).orderBy(desc(attempts.createdAt)),
    db.select().from(bankImports).where(eq(bankImports.businessId, businessId)).orderBy(desc(bankImports.createdAt)),
  ]);
  return { generatedAt: new Date().toISOString(), summary, attempts: await Promise.all(rows.map(attemptJson)),
    imports: imports.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })) };
}
