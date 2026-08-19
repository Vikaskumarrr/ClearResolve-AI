/**
 * Input validation helpers for conversation/message request handlers.
 *
 * These guards run at the edge of route handlers so that persistence and
 * business logic can assume well-formed inputs. Failures throw a
 * `ValidationError` (400) which the shared route wrapper maps to a structured
 * `{ error: { code, message } }` response.
 *
 * Requirements: 6.5 (reject blank message content), 8.2 (structured validation
 * errors for malformed requests).
 */

import { ValidationError } from "../ingestion/errors.js";

/**
 * Ensure `value` is a non-blank string.
 *
 * Rejects `undefined`/`null`, non-string values, empty strings, and strings
 * containing only whitespace. On success the original (untrimmed) string is
 * returned so callers control any normalization.
 *
 * @param value - The candidate value to validate.
 * @param field - Human-readable field name used in the error message.
 * @returns The validated string.
 * @throws {ValidationError} If `value` is missing, not a string, or blank.
 */
export function requireNonBlankString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${field} is required`);
  }
  return value;
}
