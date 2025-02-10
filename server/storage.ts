import { users, documents, accessRequests } from "@shared/schema";
import type { User, InsertUser, Document, AccessRequest } from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";

const MemoryStore = createMemoryStore(session);

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private documents: Map<number, Document>;
  private accessRequests: Map<number, AccessRequest>;
  private currentId: { [key: string]: number };
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.documents = new Map();
    this.accessRequests = new Map();
    this.currentId = { users: 1, documents: 1, accessRequests: 1 };
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId.users++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getDocuments(userId: number): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(
      (doc) => doc.userId === userId
    );
  }

  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async createDocument(document: Omit<Document, "id">): Promise<Document> {
    const id = this.currentId.documents++;
    const newDoc = { ...document, id };
    this.documents.set(id, newDoc);
    return newDoc;
  }

  async updateDocument(id: number, updates: Partial<Document>): Promise<Document> {
    const document = await this.getDocument(id);
    if (!document) throw new Error("Document not found");
    
    const updatedDoc = { ...document, ...updates };
    this.documents.set(id, updatedDoc);
    return updatedDoc;
  }

  async deleteDocument(id: number): Promise<void> {
    this.documents.delete(id);
  }

  async getAccessRequests(userId: number): Promise<AccessRequest[]> {
    return Array.from(this.accessRequests.values()).filter(
      (req) => req.userId === userId
    );
  }

  async createAccessRequest(request: Omit<AccessRequest, "id">): Promise<AccessRequest> {
    const id = this.currentId.accessRequests++;
    const newRequest = { ...request, id };
    this.accessRequests.set(id, newRequest);
    return newRequest;
  }

  async updateAccessRequest(id: number, updates: Partial<AccessRequest>): Promise<AccessRequest> {
    const request = this.accessRequests.get(id);
    if (!request) throw new Error("Access request not found");
    
    const updatedRequest = { ...request, ...updates };
    this.accessRequests.set(id, updatedRequest);
    return updatedRequest;
  }
}

export const storage = new MemStorage();
