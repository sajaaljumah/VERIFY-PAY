import { Router, type IRouter } from "express";
import { db, businesses, payments, receipts, attempts } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  GetProfileResponse, UpdateProfileBody, UpdateProfileResponse, CreatePaymentBody, CreatePaymentResponse,
  ListPaymentsQueryParams, ListPaymentsResponse, GetPaymentParams, GetPaymentResponse,
  GetDashboardResponse, ListAttemptsQueryParams, ListAttemptsResponse, GetReportsResponse,
} from "@workspace/api-zod";
import { Problem } from "../lib/problem";
import { toFils } from "../lib/money";
import { paymentJson, receiptJson, attemptJson } from "../lib/serializers";
import { dashboard, report } from "../lib/dashboard";

const router: IRouter = Router();
router.get("/profile", async (req, res): Promise<void> => {
  const [b] = await db.select().from(businesses).where(eq(businesses.id, req.businessId));
  res.json(GetProfileResponse.parse({ ...b, currency: "KWD" }));
});
router.patch("/profile", async (req, res): Promise<void> => {
  const body = UpdateProfileBody.parse(req.body);
  if (!body.businessName.trim() || !body.ownerName.trim()) throw new Problem(400, "Business name and owner name are required.");
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) throw new Problem(400, "Please provide a valid email address.");
  const [b] = await db.update(businesses).set({ ...body, businessName: body.businessName.trim(), ownerName: body.ownerName.trim() }).where(eq(businesses.id, req.businessId)).returning();
  res.json(UpdateProfileResponse.parse({ ...b, currency: "KWD" }));
});
router.get("/dashboard", async (req, res): Promise<void> => { res.json(GetDashboardResponse.parse(await dashboard(req.businessId))); });
router.get("/payments", async (req, res): Promise<void> => {
  const q = ListPaymentsQueryParams.parse(req.query);
  let rows = await db.select().from(payments).where(eq(payments.businessId, req.businessId)).orderBy(desc(payments.createdAt));
  if (q.status) rows = rows.filter((p) => p.status === q.status);
  if (q.search) { const s = q.search.toLowerCase(); rows = rows.filter((p) => `${p.customerName} ${p.orderId} ${p.reference}`.toLowerCase().includes(s)); }
  res.json(ListPaymentsResponse.parse(await Promise.all(rows.map(paymentJson))));
});
router.post("/payments", async (req, res): Promise<void> => {
  const body = CreatePaymentBody.parse(req.body);
  if (!body.customerName.trim() || !body.orderId.trim()) throw new Problem(400, "Customer name and order ID are required.");
  const [sameOrder] = await db.select({ id: payments.id }).from(payments).where(and(eq(payments.businessId, req.businessId), eq(payments.orderId, body.orderId.trim())));
  if (sameOrder) throw new Problem(409, "A payment request with that order ID already exists.");
  const [p] = await db.insert(payments).values({
    id: randomUUID(), businessId: req.businessId, reference: `VP-${randomUUID().slice(0, 8).toUpperCase()}`,
    ...body, customerName: body.customerName.trim(), orderId: body.orderId.trim(), amountFils: toFils(body.amount),
  }).returning();
  res.status(201).json(CreatePaymentResponse.parse(await paymentJson(p!)));
});
router.get("/payments/:id", async (req, res): Promise<void> => {
  const { id } = GetPaymentParams.parse(req.params);
  const [p] = await db.select().from(payments).where(and(eq(payments.id, id), eq(payments.businessId, req.businessId)));
  if (!p) throw new Problem(404, "Payment request not found.");
  const [rs, ats] = await Promise.all([
    db.select().from(receipts).where(and(eq(receipts.paymentId, id), eq(receipts.businessId, req.businessId))).orderBy(desc(receipts.createdAt)),
    db.select().from(attempts).where(and(eq(attempts.paymentId, id), eq(attempts.businessId, req.businessId))).orderBy(desc(attempts.createdAt)),
  ]);
  res.json(GetPaymentResponse.parse({ payment: await paymentJson(p), receipts: await Promise.all(rs.map(receiptJson)), attempts: await Promise.all(ats.map(attemptJson)) }));
});
router.get("/attempts", async (req, res): Promise<void> => {
  const q = ListAttemptsQueryParams.parse(req.query);
  let rows = await db.select().from(attempts).where(eq(attempts.businessId, req.businessId)).orderBy(desc(attempts.createdAt));
  if (q.status) rows = rows.filter((a) => a.status === q.status);
  if (q.search) { const s = q.search.toLowerCase(); rows = rows.filter((a) => `${a.customerName} ${a.orderId} ${a.reference}`.toLowerCase().includes(s)); }
  res.json(ListAttemptsResponse.parse(await Promise.all(rows.map(attemptJson))));
});
router.get("/reports", async (req, res): Promise<void> => { res.json(GetReportsResponse.parse(await report(req.businessId))); });
const csvCell = (value: unknown) => {
  let v = String(value ?? "");
  if (/^[\s]*[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return `"${v.replace(/"/g, '""')}"`;
};
router.get("/export.csv", async (req, res): Promise<void> => {
  const q = ListPaymentsQueryParams.parse(req.query);
  let ps = await db.select().from(payments).where(eq(payments.businessId, req.businessId)).orderBy(desc(payments.createdAt));
  if (q.status) ps = ps.filter((p) => p.status === q.status);
  if (q.search) { const s = q.search.toLowerCase(); ps = ps.filter((p) => `${p.customerName} ${p.orderId} ${p.reference}`.toLowerCase().includes(s)); }
  const rows = ps.map((p) => [p.reference, p.customerName, p.orderId, (p.amountFils / 1000).toFixed(3), "KWD", p.status, p.createdAt.toISOString(), req.isDemo ? "DEMO" : "BUSINESS", "Imported-record match only; not independent settlement confirmation"].map(csvCell).join(","));
  res.attachment("verify-pay-report.csv").type("text/csv").send("\uFEFFreference,customer_name,order_id,amount,currency,status,created_at,data_source,verification_scope\r\n" + rows.join("\r\n"));
});
export default router;
