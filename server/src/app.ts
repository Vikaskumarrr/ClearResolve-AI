import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";

import { chatRouter } from "./routes/chat.js";
import { uploadRouter } from "./routes/upload.js";
import { ingestRouter } from "./routes/ingest.js";
import { jobsRouter } from "./routes/jobs.js";
import { authRouter } from "./routes/auth.js";
import { conversationsRouter } from "./routes/conversations.js";
import { createSessionMiddleware } from "./auth/auth.js";

/**
 * Build the Express application.
 *
 * - JSON body parsing for the chat endpoint.
 * - CORS restricted to the React frontend dev origin (with credentials so the
 *   browser sends the session cookie on cross-origin requests).
 * - A MongoDB-backed session middleware that establishes `req.session.userId`.
 * - Routers mounted under `/api`.
 * - Health check at `/api/health`.
 * - A final error-handling middleware that always returns `{ error }` JSON.
 */
export function buildApp(): Express {
  const app = express();

  app.use(express.json());
  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
      // Allow the browser to send/receive the session cookie cross-origin
      // (the Vite dev client runs on a different port than this API).
      credentials: true,
    })
  );

  // Session middleware must run before any route that reads/writes the
  // session (the auth routes below, and later the authenticated upload/chat
  // routes once task 6.3 wires `requireUser()` in).
  app.use(createSessionMiddleware());

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.use("/api", authRouter);
  app.use("/api", chatRouter);
  app.use("/api", uploadRouter);
  app.use("/api", ingestRouter);
  app.use("/api", jobsRouter);
  app.use("/api", conversationsRouter);

  // Final error-handling middleware. Express identifies it by its 4 args.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    const message =
      err instanceof Error ? err.message : "Internal Server Error";
    res.status(500).json({ error: message });
  });

  return app;
}
