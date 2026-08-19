import { Router, type Request, type Response } from "express";

import { requireUser } from "../auth/session.js";
import { answer } from "../chat.js";
import {
  createConversation,
  listConversations,
  getConversation,
  getMessages,
  renameConversation,
  deleteConversation,
  saveTurn,
} from "../conversations/store.js";
import { requireNonBlankString } from "../conversations/validate.js";
import { handleRoute } from "./handleRoute.js";

/**
 * Conversation history API used by the dashboard sidebar and chat view.
 *
 * Every handler authenticates FIRST via `requireUser(req)` (401 when there is
 * no session), then delegates to the Conversation_Store scoped by `userId`
 * (`requireUser` returns `{ userId, tenantId }` with `tenantId === userId`;
 * the store's first parameter is `userId`). All persistence lives in the store,
 * which throws typed errors — notably `NotFoundError` (404) for a missing or
 * non-owned id, so existence is never leaked (Requirements 2.3, 2.4). The
 * shared `handleRoute` wrapper maps every thrown `AppError` to a structured
 * `{ error: { code, message } }` response with the error's own status
 * (Requirements 8.1, 8.2).
 *
 * Endpoints:
 *   - `POST   /api/conversations`      → 201 { conversation } (Req 2.1, 3.3)
 *   - `GET    /api/conversations`      → 200 { conversations } (Req 4.1, 4.2)
 *   - `GET    /api/conversations/:id`  → 200 { conversation, messages }
 *                                        (Req 5.1, 5.2, 5.3, 2.4)
 *   - `PATCH  /api/conversations/:id`  → 200 { conversation } (Req 3.1, 3.4)
 *   - `DELETE /api/conversations/:id`  → 204 (no body) (Req 9.1)
 *   - `POST   /api/conversations/:id/messages`
 *                                      → 200 { title, userMessage,
 *                                        assistantMessage } (Req 2.1, 6.1–6.5)
 */
export const conversationsRouter = Router();

conversationsRouter.post(
  "/conversations",
  handleRoute(async (req: Request, res: Response) => {
    // Authenticate FIRST: resolve the user from the session (401 if absent).
    const { userId } = requireUser(req);

    // Create a new, empty conversation owned by the caller (Req 2.1, 3.3).
    const conversation = await createConversation(userId);
    res.status(201).json({ conversation });
  })
);

conversationsRouter.get(
  "/conversations",
  handleRoute(async (req: Request, res: Response) => {
    // Authenticate FIRST: resolve the user from the session (401 if absent).
    const { userId } = requireUser(req);

    // Tenant-scoped list, most-recently-updated first (Req 4.1, 4.2).
    const conversations = await listConversations(userId);
    res.status(200).json({ conversations });
  })
);

conversationsRouter.get(
  "/conversations/:id",
  handleRoute(async (req: Request, res: Response) => {
    // Authenticate FIRST: resolve the user from the session (401 if absent).
    const { userId } = requireUser(req);

    // Ownership-checked fetch: both calls throw `NotFoundError` (404) for a
    // missing or non-owned id rather than leaking existence (Req 2.4).
    const id = String(req.params.id);
    const conversation = await getConversation(userId, id);
    const messages = await getMessages(userId, id);
    res.status(200).json({ conversation, messages });
  })
);

conversationsRouter.patch(
  "/conversations/:id",
  handleRoute(async (req: Request, res: Response) => {
    // Authenticate FIRST: resolve the user from the session (401 if absent).
    const { userId } = requireUser(req);

    // Validate the new title before writing: a missing/blank title is a
    // structured `ValidationError` (400) (Req 8.2).
    const id = String(req.params.id);
    const title = requireNonBlankString(req.body?.title, "title");

    // Ownership-checked rename; throws `NotFoundError` (404) if not owned.
    const conversation = await renameConversation(userId, id, title);
    res.status(200).json({ conversation });
  })
);

conversationsRouter.delete(
  "/conversations/:id",
  handleRoute(async (req: Request, res: Response) => {
    // Authenticate FIRST: resolve the user from the session (401 if absent).
    const { userId } = requireUser(req);

    // Ownership-checked delete + message cascade; throws `NotFoundError` (404)
    // for a missing or non-owned id (Req 2.4, 9.1). No body on success.
    const id = String(req.params.id);
    await deleteConversation(userId, id);
    res.status(204).end();
  })
);

conversationsRouter.post(
  "/conversations/:id/messages",
  handleRoute(async (req: Request, res: Response) => {
    // Authenticate FIRST: resolve the user from the session (401 if absent).
    const { userId } = requireUser(req);

    // Validate the message BEFORE any write: a missing/blank message is a
    // structured `ValidationError` (400) and no turn is persisted (Req 6.5).
    const id = String(req.params.id);
    const message = requireNonBlankString(req.body?.message, "message");

    // Ownership-checked fetch; throws `NotFoundError` (404) for a missing or
    // non-owned id rather than leaking existence (Req 2.4, 6.1).
    await getConversation(userId, id);

    // Generate the grounded answer (tenant-scoped retrieval) (Req 2.1).
    const { answer: assistantContent, citations } = await answer(userId, message);

    // Persist the user + assistant turn atomically and in order; the store
    // bumps `updatedAt` and derives the title on the first turn (Req 6.2–6.4).
    const { title, userMessage, assistantMessage } = await saveTurn(userId, id, {
      user: { content: message },
      assistant: { content: assistantContent, citations },
    });

    res.json({ title, userMessage, assistantMessage });
  })
);
