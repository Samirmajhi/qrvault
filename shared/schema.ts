import { pgTable, text, serial, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  pin: text("pin").notNull(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  name: text("name").notNull(),
  content: text("content").notNull(),
  contentType: text("content_type").notNull(),
});

export const accessRequests = pgTable("access_requests", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  requestedDocuments: jsonb("requested_documents").$type<string[]>().notNull(),
  requesterInfo: jsonb("requester_info").$type<{
    deviceInfo: string;
    location?: string;
    timestamp: string;
  }>().notNull(),
  status: text("status").notNull(),  // pending, approved, denied
});

export const insertUserSchema = createInsertSchema(users);
export const insertDocumentSchema = createInsertSchema(documents);
export const insertAccessRequestSchema = createInsertSchema(accessRequests);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type AccessRequest = typeof accessRequests.$inferSelect;
