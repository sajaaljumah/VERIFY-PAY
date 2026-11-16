import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const businesses = pgTable("vp_businesses", {
  id: text("id").primaryKey(),
  isDemo: boolean("is_demo").notNull().default(false),
  businessName: text("business_name").notNull(),
  ownerName: text("owner_name").notNull().default(""),
  email: text("email").notNull().default(""),
  language: text("language").notNull().default("en"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const insertBusinessSchema = createInsertSchema(businesses);
export type Business = typeof businesses.$inferSelect;
