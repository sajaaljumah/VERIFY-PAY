import { pgTable, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { businesses } from "./businesses";

export const bankImports = pgTable("vp_imports", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull().references(() => businesses.id),
  fileName: text("file_name").notNull(),
  imported: integer("imported").notNull(),
  duplicates: integer("duplicates").notNull(),
  rejected: integer("rejected").notNull(),
  errors: jsonb("errors").$type<string[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertImportSchema = createInsertSchema(bankImports);
