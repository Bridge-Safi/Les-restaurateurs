import { pgTable, text, serial, timestamp, real, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const orderItemSchema = z.object({
  name: z.string(),
  quantity: z.number().int(),
  price: z.number(),
  notes: z.string().nullable().optional(),
});

export type OrderItem = z.infer<typeof orderItemSchema>;

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  restaurantId: text("restaurant_id"),
  orderNumber: text("order_number").notNull(),
  status: text("status").notNull().default("pending"),
  platform: text("platform").notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  items: jsonb("items").notNull().$type<OrderItem[]>(),
  totalAmount: real("total_amount").notNull(),
  estimatedPrepTime: integer("estimated_prep_time"),
  deliveryAddress: text("delivery_address"),
  deliveryPersonName: text("delivery_person_name"),
  deliveryPersonPhone: text("delivery_person_phone"),
  notes: text("notes"),
  rejectionReason: text("rejection_reason"),
  callbackUrl: text("callback_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  readyAt: timestamp("ready_at", { withTimezone: true }),
  // Renseigne quand le livreur a recupere la commande (coche verte kanban)
  pickedUpAt: timestamp("picked_up_at", { withTimezone: true }),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
