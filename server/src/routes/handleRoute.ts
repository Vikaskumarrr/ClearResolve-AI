import type { NextFunction, Request, RequestHandler, Response } from "express";

import { AppError } from "../ingestion/errors.js";

/**
 * An async Express route handler. Behaves like a normal handler — it reads
 * `req` and writes the response via `res` (e.g. `res.status(202).json(...)`)
 * — but may be `async` and may throw. Any value it returns is ignored; the
 * response is produced by calling `res` directly, as handlers do today.
 */
export type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => unknown | Promise<unknown>;

/**
 * Shared route error wrapper (Requirement 8.5).
 *
 * Wraps an async route handler so every route maps thrown errors to the same
 * structured `{ error: { code, message } }` response, removing the duplicated
 * inline try/catch that previously lived in each route:
 *
 *   - A thrown {@link AppError} (any typed error — `AuthError`, `ValidationError`,
 *     `AuthorizationError`, `UnsupportedFormatError`, `FileTooLargeError`,
 *     `StageError`, `InternalError`, ...) maps to its own HTTP `status` with the
 *     body `{ error: { code, message } }`. Its `code`/`message` are safe to
 *     return to clients.
 *   - Any other (unexpected) error is logged in full server-side via
 *     `console.error` and answered with a generic `500`
 *     `{ error: { code: "INTERNAL_ERROR", message: "Internal server error" } }`.
 *     Internal details (stack traces, messages, causes) are never leaked to the
 *     client.
 *
 * The full detail of typed errors is also logged server-side to aid debugging,
 * while only the client-safe `code`/`message` reach the response.
 *
 * Handlers keep their existing shape: they call `res` directly and may be
 * `async`. The wrapper only adds the surrounding try/catch. If the wrapped
 * handler somehow completes without sending a response, it is left untouched
 * so the application-level middleware in `app.ts` can act as a last resort.
 *
 * @param handler the async route handler to wrap.
 * @returns an Express {@link RequestHandler} with centralized error mapping.
 */
export function handleRoute(handler: AsyncRouteHandler): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res, next);
    } catch (err) {
      // Typed errors carry a client-safe code + HTTP status. Log the full
      // detail server-side, then respond with the structured shape.
      if (err instanceof AppError) {
        console.error(err);
        if (!res.headersSent) {
          res
            .status(err.status)
            .json({ error: { code: err.code, message: err.message } });
        }
        return;
      }

      // Unexpected failure: log the full detail server-side but never leak
      // internals to the client (Requirement 8.5). Respond with a generic
      // InternalError-shaped 500.
      console.error(err);
      if (!res.headersSent) {
        res.status(500).json({
          error: { code: "INTERNAL_ERROR", message: "Internal server error" },
        });
      }
    }
  };
}
