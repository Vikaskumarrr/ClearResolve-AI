/**
 * Typed error hierarchy for the ingestion pipeline and request handlers.
 *
 * Each error carries a machine-readable `code` string and an HTTP `status`
 * number so the shared route wrapper (`handleRoute`) can map any thrown error
 * to a structured `{ error: { code, message } }` response with the correct
 * HTTP status. See design.md "Error Handling".
 *
 * Requirements: 3.7 (stage-named pipeline failures), 8.5 (structured errors).
 */

/** The ordered stages of the ingestion pipeline. */
export type PipelineStage = "load" | "chunk" | "embed" | "store";

/**
 * Base class for every typed error in the system. Subclasses fix the `code`
 * and HTTP `status` for their category.
 */
export abstract class AppError extends Error {
  /** Machine-readable error code (stable identifier for clients/logs). */
  abstract readonly code: string;
  /** HTTP status code appropriate to this error type. */
  abstract readonly status: number;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options as ErrorOptions);
    // Restore prototype chain (needed when targeting ES5/ES2017 output).
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
  }
}

/** 401 - the request lacks a valid authenticated session. */
export class AuthError extends AppError {
  readonly code = "AUTH_REQUIRED";
  readonly status = 401;

  constructor(message = "Authentication required") {
    super(message);
  }
}

/** 403 - the authenticated user may not access the requested resource. */
export class AuthorizationError extends AppError {
  readonly code = "FORBIDDEN";
  readonly status = 403;

  constructor(message = "You do not have access to this resource") {
    super(message);
  }
}

/** 400 - the request failed validation (e.g. missing/empty chat message). */
export class ValidationError extends AppError {
  readonly code = "VALIDATION_ERROR";
  readonly status = 400;

  constructor(message = "Invalid request") {
    super(message);
  }
}

/** 404 - the requested resource does not exist or is not owned by the user. */
export class NotFoundError extends AppError {
  readonly code = "NOT_FOUND";
  readonly status = 404;

  constructor(message = "Resource not found") {
    super(message);
  }
}

/** 400 - the source format is not one of the supported loaders. */
export class UnsupportedFormatError extends AppError {
  readonly code = "UNSUPPORTED_FORMAT";
  readonly status = 400;
  /** The offending format identifier that was rejected. */
  readonly format: string;

  constructor(format: string) {
    super(`Unsupported format: ${format}`);
    this.format = format;
  }
}

/** 400 - the uploaded file exceeds the configured maximum size. */
export class FileTooLargeError extends AppError {
  readonly code = "FILE_TOO_LARGE";
  readonly status = 400;

  constructor(message = "File too large") {
    super(message);
  }
}

/**
 * 500 - a pipeline stage threw. Names the failed stage (load|chunk|embed|store)
 * and preserves the original error as `cause`.
 */
export class StageError extends AppError {
  readonly code = "STAGE_ERROR";
  readonly status = 500;
  /** The pipeline stage that failed. */
  readonly stage: PipelineStage;

  constructor(stage: PipelineStage, cause?: unknown) {
    super(`Ingestion failed at stage: ${stage}`, { cause });
    this.stage = stage;
  }
}

/** 500 - fallback for unexpected/unclassified failures. */
export class InternalError extends AppError {
  readonly code = "INTERNAL_ERROR";
  readonly status = 500;

  constructor(message = "Internal server error", options?: { cause?: unknown }) {
    super(message, options);
  }
}
