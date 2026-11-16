import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { businesses } from "./businesses";
import { payments } from "./payments";

export const receipts = pgTable("vp_receipts", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull().references(() => businesses.id),
  paymentId: text("payment_id").notNull().references(() => payments.id),
  objectPath: text("object_path").notNull(),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  expectedSize: integer("expected_size").notNull(),
  fileHash: text("file_hash"),
  amountFils: integer("amount_fils"),
  transactionDate: text("transaction_date").notNull().default(""),
  reference: text("reference").notNull().default(""),
  sender: text("sender").notNull().default(""),
  receiver: text("receiver").notNull().default(""),
  confidence: text("confidence").notNull().default("unprocessed"),
  extractionNote: text("extraction_note").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertReceiptSchema = createInsertSchema(receipts);
export type ReceiptRow = typeof receipts.$inferSelect;
