import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const restaurantsTable = pgTable("restaurants", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  name: text("name").notNull().default("Mon Restaurant"),
  apiToken: text("api_token")
    .notNull()
    .default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Restaurant = typeof restaurantsTable.$inferSelect;
