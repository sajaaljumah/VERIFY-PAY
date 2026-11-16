import { pgTable, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { businesses } from "./businesses";
import { payments } from "./payments";
import { receipts } from "./receipts";
import { bankTransactions } from "./bank-transactions";

export type Check = { label: string; passed: boolean | null; detail: string };
export const attempts = pgTable("vp_attempts", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull().references(() => businesses.id),
  paymentId: text("payment_id").notNull().references(() => payments.id),
  receiptId: text("receipt_id").notNull().references(() => receipts.id),
  bankTransactionId: text("bank_transaction_id").references(() => bankTransactions.id),
  customerName: text("customer_name").notNull(),
  orderId: text("order_id").notNull(),
  reference: text("reference").notNull(),
  amountFils: integer("amount_fils").notNull(),
  status: text("status").notNull(),
  reason: text("reason").notNull(),
  checks: jsonb("checks").$type<Check[]>().notNull(),
  reviewedFields: jsonb("reviewed_fields").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertAttemptSchema = createInsertSchema(attempts);
export type AttemptRow = typeof attempts.$inferSelect;
