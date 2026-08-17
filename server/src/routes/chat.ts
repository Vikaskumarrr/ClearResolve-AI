import { Router, type Request, type Response } from "express";

import { answer as generateAnswer } from "../chat.js";
import { requireUser } from "../auth/session.js";
import { ValidationError } from "../ingestion/errors.js";
import { handleRoute } from "./handleRoute.js";

/**
 * POST /api/chat
 * Body: { message: string }
 * Success: { answer: string, citations: Citation[] }
 * Errors:  { error: { code, message } } with the status of the typed error
 *          (401 unauthenticated / 400 validation / 500 failure). The shared
 *          `handleRoute` wrapper performs this mapping (Requirement 8.5).
 */
export const chatRouter = Router();

chatRouter.post(
  "/chat",
  handleRoute(async (req: Request, res: Response) => {
    // Authenticate FIRST (Requirement 6.1): resolve the tenant from the
    // session before doing any retrieval. Throws `AuthError` (401) when there
    // is no logged-in user, mapped to a structured 401 by `handleRoute`.
    const { tenantId } = requireUser(req);

    // Validate the message (Requirement 5.5): reject a missing, non-string,
    // empty, or whitespace-only message with a typed `ValidationError` (400)
    // so it maps to the same structured shape as every other error.
    const { message } = req.body ?? {};
    if (typeof message !== "string" || message.trim().length === 0) {
      throw new ValidationError("Message is required");
    }

    // Thread `tenantId` through so retrieval is scoped to the caller's own
    // documents (Requirement 6.4). The chat service returns an answer plus
    // source citations (Requirement 5.4); return the full result so the
    // citations reach the client.
    const result = await generateAnswer(tenantId, message);
    res.json(result);
  })
);
