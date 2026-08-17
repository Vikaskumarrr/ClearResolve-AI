import { Router, type Request, type Response, type NextFunction } from "express";

import {
  registerUser,
  verifyCredentials,
  findUserById,
} from "../auth/auth.js";
import { AppError } from "../ingestion/errors.js";

/**
 * Authentication routes mounted under `/api/auth`.
 *
 * These establish a session that carries the authenticated user's id
 * (`req.session.userId`), which task 6.2's `requireUser()` reads to resolve
 * `{ userId, tenantId }`. Endpoints:
 *
 *   POST /api/auth/register  { email, password } -> creates a user + logs in
 *   POST /api/auth/login     { email, password } -> logs in
 *   POST /api/auth/logout                        -> destroys the session
 *   GET  /api/auth/me                            -> current user or 401
 *
 * NOTE: these routes depend on the session middleware being mounted in
 * `app.ts`. The upload/chat routes remain UNAUTHENTICATED until task 6.3
 * wires `requireUser()` into them.
 */
export const authRouter = Router();

/** Persist the authenticated user's id into the session and answer with it. */
function establishSession(
  req: Request,
  res: Response,
  next: NextFunction,
  user: { id: string; email: string },
): void {
  // Regenerate the session id on privilege change to prevent session fixation.
  req.session.regenerate((regenErr) => {
    if (regenErr) {
      return next(regenErr);
    }
    req.session.userId = user.id;
    req.session.save((saveErr) => {
      if (saveErr) {
        return next(saveErr);
      }
      res.json({ user });
    });
  });
}

authRouter.post(
  "/auth/register",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body ?? {};
      const user = await registerUser(email, password);
      return establishSession(req, res, next, user);
    } catch (err) {
      if (err instanceof AppError) {
        return res
          .status(err.status)
          .json({ error: { code: err.code, message: err.message } });
      }
      return next(err);
    }
  },
);

authRouter.post(
  "/auth/login",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body ?? {};
      const user = await verifyCredentials(email, password);
      if (!user) {
        // Uniform message so we never reveal whether the email exists.
        return res.status(401).json({
          error: { code: "AUTH_REQUIRED", message: "Invalid credentials" },
        });
      }
      return establishSession(req, res, next, user);
    } catch (err) {
      if (err instanceof AppError) {
        return res
          .status(err.status)
          .json({ error: { code: err.code, message: err.message } });
      }
      return next(err);
    }
  },
);

authRouter.post(
  "/auth/logout",
  (req: Request, res: Response, next: NextFunction) => {
    req.session.destroy((err) => {
      if (err) {
        return next(err);
      }
      return res.json({ ok: true });
    });
  },
);

authRouter.get(
  "/auth/me",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res
          .status(401)
          .json({ error: { code: "AUTH_REQUIRED", message: "Not authenticated" } });
      }
      const user = await findUserById(userId);
      if (!user) {
        // Session references a user that no longer exists; clear it.
        return req.session.destroy(() => {
          res
            .status(401)
            .json({ error: { code: "AUTH_REQUIRED", message: "Not authenticated" } });
        });
      }
      return res.json({ user });
    } catch (err) {
      return next(err);
    }
  },
);
