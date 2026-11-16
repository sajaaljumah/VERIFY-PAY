import { pgTable, text, integer, date, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { businesses } from "./businesses";
import { payments } from "./payments";

export const bankTransactions = pgTable("vp_bank_transactions", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull().references(() => businesses.id),
  transactionId: text("transaction_id").notNull(),
  reference: text("reference").notNull().default(""),
  amountFils: integer("amount_fils").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  description: text("description").notNull().default(""),
  sender: text("sender").notNull().default(""),
  matchedPaymentId: text("matched_payment_id").references(() => payments.id),
  importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("vp_bank_txid_unique").on(t.businessId, t.transactionId),
  uniqueIndex("vp_bank_ref_unique").on(t.businessId, t.reference).where(sql`${t.reference} <> ''`),
  uniqueIndex("vp_bank_payment_unique").on(t.matchedPaymentId).where(sql`${t.matchedPaymentId} is not null`),
]);
export const insertBankTransactionSchema = createInsertSchema(bankTransactions);
export type BankRow = typeof bankTransactions.$inferSelect;
