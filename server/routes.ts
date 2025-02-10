import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { setupAuth, compareHash } from "./auth";
import { insertDocumentSchema } from "@shared/schema";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Add PIN verification endpoint
  app.post("/api/verify-pin/:userId", async (req, res) => {
    const { pin } = req.body;
    const userId = Number(req.params.userId);

    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const isValid = await compareHash(pin, user.pin);
      if (isValid) {
        // Store verified userId in session
        req.session.verifiedUserId = userId;
      }
      res.json({ isValid });
    } catch (error) {
      console.error("PIN verification error:", error);
      res.status(500).json({ message: "Failed to verify PIN" });
    }
  });

  // Add endpoint to get user's documents
  app.get("/api/documents/:userId", async (req, res) => {
    const userId = Number(req.params.userId);
    try {
      const documents = await storage.getDocuments(userId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // Document routes
  app.post("/api/documents", upload.single("file"), async (req, res) => {
    console.log("File upload request received", {
      user: req.user?.id,
      file: req.file ? {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : "missing",
      body: req.body,
      headers: req.headers['content-type']
    });

    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!req.file) {
      console.log("No file in request");
      return res.status(400).json({ message: "No file uploaded" });
    }

    if (!req.body.name) {
      return res.status(400).json({ message: "Document name is required" });
    }

    try {
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

      console.log("Document created successfully", { id: document.id });
      res.status(201).json(document);
    } catch (error) {
      console.error("Error creating document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  app.get("/api/documents", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const documents = await storage.getDocuments(req.user.id);
    res.json(documents);
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

  // Add document view endpoint
  app.get("/api/documents/:id/view", async (req, res) => {
    const document = await storage.getDocument(Number(req.params.id));

    // Allow access if user is authenticated OR has verified PIN
    const hasAccess = req.user?.id === document?.userId ||
      req.session.verifiedUserId === document?.userId;

    if (!document || !hasAccess) {
      return res.status(401).json({ message: "Unauthorized access" });
    }

    const buffer = Buffer.from(document.content, "base64");
    res.setHeader("Content-Type", document.contentType);
    res.send(buffer);
  });

  // Update download endpoint to support verified PIN users
  app.get("/api/documents/:id/download", async (req, res) => {
    const document = await storage.getDocument(Number(req.params.id));

    // Allow access if user is authenticated OR has verified PIN
    const hasAccess = req.user?.id === document?.userId ||
      req.session.verifiedUserId === document?.userId;

    if (!document || !hasAccess) {
      return res.status(401).json({ message: "Unauthorized access" });
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