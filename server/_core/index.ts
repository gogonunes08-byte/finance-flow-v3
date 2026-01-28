import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

import session from "express-session";
import passport from "passport";
import { setupAuth } from "../auth";
import { initScheduler } from "../services/scheduler";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function checkDatabaseConnection() {
  try {
    const db = await getDb();
    if (!db) {
      console.error("❌ [Database] Connection failed: failed to initialize client.");
      return false;
    }
    // Try a simple query to verify connection
    await db.execute(sql`SELECT 1`);
    console.log("✅ [Database] Connected successfully!");
    return true;
  } catch (error) {
    console.error("❌ [Database] Connection failed:", error);
    console.error("💡 DICA: Verifique se o XAMPP/MySQL está rodando na porta 3306 e se o banco 'finance_flow_v3' foi criado.");
    return false;
  }
}

async function startServer() {
  // Verify Database Connection First
  const isDbConnected = await checkDatabaseConnection();
  if (!isDbConnected) {
    console.error("⚠️ Server starting without active database connection. Some features may fail.");
  }


  // Initialize Scheduler
  initScheduler();

  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Session & Auth
  app.use(
    session({
      secret: process.env.JWT_SECRET || "super_secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: process.env.NODE_ENV === "production" },
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());
  setupAuth();

  // Auth Routes
  app.get(
    "/api/auth/google",
    passport.authenticate("google", { scope: ["profile", "email", "https://www.googleapis.com/auth/drive.file"] })
  );

  app.get(
    "/api/auth/callback/google",
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
      res.redirect("/");
    }
  );

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Graceful Shutdown
  const shutdown = async () => {
    console.log("\n[Server] 🛑 Desligando servidor...");

    server.close(() => {
      console.log("[Server] 👋 Servidor HTTP fechado.");
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);

    // Inicialização do servidor concluída
  });
}

startServer().catch(console.error);
