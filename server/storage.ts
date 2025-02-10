import { users, documents, accessRequests } from "@shared/schema";
import type { User, InsertUser, Document, AccessRequest } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getDocuments(userId: number): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  createDocument(document: Omit<Document, "id">): Promise<Document>;
  updateDocument(id: number, updates: Partial<Document>): Promise<Document>;
  deleteDocument(id: number): Promise<void>;

  getAccessRequests(userId: number): Promise<AccessRequest[]>;
  createAccessRequest(request: Omit<AccessRequest, "id">): Promise<AccessRequest>;
  updateAccessRequest(id: number, updates: Partial<AccessRequest>): Promise<AccessRequest>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getDocuments(userId: number): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.userId, userId));
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document;
  }

  async createDocument(document: Omit<Document, "id">): Promise<Document> {
    const [newDoc] = await db.insert(documents).values(document).returning();
    return newDoc;
  }

  async updateDocument(id: number, updates: Partial<Document>): Promise<Document> {
    const [updatedDoc] = await db
      .update(documents)
      .set(updates)
      .where(eq(documents.id, id))
      .returning();

    if (!updatedDoc) throw new Error("Document not found");
    return updatedDoc;
  }

  async deleteDocument(id: number): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  async getAccessRequests(userId: number): Promise<AccessRequest[]> {
    return await db
      .select()
      .from(accessRequests)
      .where(eq(accessRequests.userId, userId));
  }

  async createAccessRequest(request: Omit<AccessRequest, "id">): Promise<AccessRequest> {
    const [newRequest] = await db
      .insert(accessRequests)
      .values(request)
      .returning();
    return newRequest;
  }

  async updateAccessRequest(id: number, updates: Partial<AccessRequest>): Promise<AccessRequest> {
    const [updatedRequest] = await db
      .update(accessRequests)
      .set(updates)
      .where(eq(accessRequests.id, id))
      .returning();

    if (!updatedRequest) throw new Error("Access request not found");
    return updatedRequest;
  }
}

export const storage = new DatabaseStorage();