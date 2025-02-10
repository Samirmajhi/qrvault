import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertDocumentSchema } from "@shared/schema";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Document routes
  app.get("/api/documents", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const documents = await storage.getDocuments(req.user.id);
    res.json(documents);
  });

  app.post("/api/documents", upload.single("file"), async (req, res) => {
    if (!req.user || !req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Check if a document with the same name exists for this user
    const existingDocs = await storage.getDocuments(req.user.id);
    if (existingDocs.some((doc) => doc.name === req.body.name)) {
      return res.status(400).json({ message: "Document with this name already exists" });
    }

    const document = await storage.createDocument({
      userId: req.user.id,
      name: req.body.name,
      content: req.file.buffer.toString("base64"),
      contentType: req.file.mimetype,
    });

    res.status(201).json(document);
  });

  app.patch("/api/documents/:id", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const document = await storage.getDocument(Number(req.params.id));
    if (!document || document.userId !== req.user.id) {
      return res.sendStatus(404);
    }

    // Check if new name conflicts with existing documents
    if (req.body.name && req.body.name !== document.name) {
      const existingDocs = await storage.getDocuments(req.user.id);
      if (existingDocs.some((doc) => doc.name === req.body.name)) {
        return res.status(400).json({ message: "Document with this name already exists" });
      }
    }

    const updatedDoc = await storage.updateDocument(document.id, {
      name: req.body.name,
    });

    res.json(updatedDoc);
  });

  app.delete("/api/documents/:id", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const document = await storage.getDocument(Number(req.params.id));
    if (!document || document.userId !== req.user.id) {
      return res.sendStatus(404);
    }

    await storage.deleteDocument(document.id);
    res.sendStatus(204);
  });

  app.get("/api/documents/:id/download", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const document = await storage.getDocument(Number(req.params.id));
    if (!document || document.userId !== req.user.id) {
      return res.sendStatus(404);
    }

    const buffer = Buffer.from(document.content, "base64");
    res.setHeader("Content-Type", document.contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${document.name}"`,
    );
    res.send(buffer);
  });

  // Access request routes
  app.post("/api/access-requests", async (req, res) => {
    if (!req.body.userId || !req.body.requestedDocuments) {
      return res.sendStatus(400);
    }

    const request = await storage.createAccessRequest({
      userId: req.body.userId,
      requestedDocuments: req.body.requestedDocuments,
      requesterInfo: {
        deviceInfo: req.headers["user-agent"] || "Unknown device",
        location: req.body.location,
        timestamp: new Date().toISOString(),
      },
      status: "pending",
    });

    res.status(201).json(request);
  });

  app.get("/api/access-requests", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const requests = await storage.getAccessRequests(req.user.id);
    res.json(requests);
  });

  app.patch("/api/access-requests/:id", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const request = await storage.updateAccessRequest(Number(req.params.id), {
      status: req.body.status,
    });

    res.json(request);
  });

  const httpServer = createServer(app);
  return httpServer;
}