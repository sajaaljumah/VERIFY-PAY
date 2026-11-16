import { pgTable, text, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { businesses } from "./businesses";

export const payments = pgTable("vp_payments", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull().references(() => businesses.id),
  reference: text("reference").notNull().unique(),
  customerName: text("customer_name").notNull(),
  orderId: text("order_id").notNull(),
  amountFils: integer("amount_fils").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("PENDING"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("vp_order_per_business").on(t.businessId, t.orderId)]);
export const insertPaymentSchema = createInsertSchema(payments);
export type PaymentRow = typeof payments.$inferSelect;
