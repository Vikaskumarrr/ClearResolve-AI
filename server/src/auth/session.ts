/**
 * Session resolution helpers (Auth_Service).
 *
 * DESIGN ADAPTATION
 * -----------------
 * The design document describes a Next.js-style parameterless `auth()` call to
 * resolve the current session. This project is a plain **Express** server, so
 * the equivalent primitive takes the Express `Request` and reads the session
 * that `express-session` attaches to it (`req.session.userId`, established by
 * the auth routes — see `auth/auth.ts` and `routes/auth.ts`).
 *
 * `requireUser()` is the single choke point every authenticated route uses to
 * turn "there is (or isn't) a logged-in user" into a typed result:
 *   - present  -> `{ userId, tenantId }` with `tenantId === userId`
 *   - absent   -> throws `AuthError` (401), which the shared route wrapper maps
 *                 to a structured `{ error: { code, message } }` response.
 *
 * Using `userId` as the `tenantId` gives every user their own isolation
 * boundary for stored documents/chunks (Requirement 6.2). Task 6.3 wires this
 * helper into the upload/chat routes; here we only provide the helper.
 *
 * Requirements: 6.1 (session-backed auth), 6.2 (resolve user, tenantId = userId).
 */

import type { Request } from "express";

import { AuthError } from "../ingestion/errors.js";

/**
 * The authenticated principal resolved from the request's session.
 *
 * `tenantId` equals `userId`: each user is their own tenant, so downstream
 * storage/retrieval scopes data by this value.
 */
export interface AuthenticatedUser {
  /** Id of the authenticated user (from `req.session.userId`). */
  userId: string;
  /** Tenant isolation boundary. Equal to `userId`. */
  tenantId: string;
}

/**
 * Resolve the authenticated user from the request's session.
 *
 * @throws {AuthError} when there is no authenticated session (401).
 * @returns `{ userId, tenantId }` with `tenantId === userId`.
 */
export function requireUser(req: Request): AuthenticatedUser {
  const userId = req.session?.userId;
  if (!userId) {
    throw new AuthError();
  }
  return { userId, tenantId: userId };
}
