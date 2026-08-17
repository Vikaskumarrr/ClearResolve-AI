import { Router, type Request, type Response } from "express";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import multer from "multer";

import { config, maxFileSizeMessage } from "../config.js";
import { detectFormat } from "../ingestion/loaders/index.js";
import { requireUser } from "../auth/session.js";
import { createJob } from "../jobs/jobManager.js";
import {
  FileTooLargeError,
  UnsupportedFormatError,
  ValidationError,
} from "../ingestion/errors.js";
import { handleRoute } from "./handleRoute.js";

/**
 * POST /api/upload
 * multipart/form-data with field `file`.
 *
 * Supports multiple formats — PDF, Markdown, TXT, HTML, and JSON — resolved
 * from the uploaded file's extension. This route does NOT run ingestion
 * inline: it validates the upload, enqueues a background `file` job, and
 * returns immediately with the new job's id (Requirement 4.1). A separate
 * worker process (see `jobs/runner.ts`) polls Mongo for queued jobs and runs
 * the shared pipeline out of band, so slow ingestion never blocks the request.
 *
 * The `jobs` document stores only `kind` and `sourceId` (no file bytes), so
 * the uploaded bytes are persisted to a deterministic temp path derived from
 * the jobId — `<os.tmpdir()>/rag-uploads/<jobId>` — which the worker reads for
 * `file` jobs and deletes once done. The original filename becomes the job's
 * `sourceId`, so re-uploading the same file replaces its chunks (dedup) rather
 * than duplicating them.
 *
 * Success: 202 { jobId: <string> }
 * Errors:  { error: { code, message } } with the status of the typed error
 *          (401 unauthenticated / 400 validation / 500 failure), mapped by the
 *          shared `handleRoute` wrapper (Requirement 8.5).
 */
export const uploadRouter = Router();

/** Directory under the OS temp dir where uploaded bytes are staged for the worker. */
const UPLOADS_DIR = path.join(os.tmpdir(), "rag-uploads");

// Keep the uploaded file in memory; we then stage the buffer to a temp file
// keyed by the jobId for the worker to pick up.
const upload = multer({ storage: multer.memoryStorage() });

uploadRouter.post(
  "/upload",
  // The multer middleware must run before the wrapped handler so `req.file`
  // is populated by the time the handler executes.
  upload.single("file"),
  handleRoute(async (req: Request, res: Response) => {
    // Authenticate FIRST (Requirements 6.1, 6.2): resolve the tenant from the
    // session before touching the uploaded file. Throws `AuthError` (401)
    // when there is no logged-in user, mapped to a structured 401 by
    // `handleRoute`.
    const { tenantId } = requireUser(req);

    const file = req.file;

    // validation — reject with a validation error (400) when no file is sent.
    if (!file) {
      throw new ValidationError("No file uploaded");
    }

    // Reject unsupported formats by name BEFORE doing any work (Requirement
    // 1.6). The error message names the offending extension.
    const format = detectFormat(file.originalname);
    if (!format) {
      const ext = file.originalname.includes(".")
        ? file.originalname.slice(file.originalname.lastIndexOf(".") + 1)
        : file.originalname;
      throw new UnsupportedFormatError(ext);
    }

    // Authoritative size check against the single source of truth, reported
    // with the true enforced limit (Requirements 1.7, 8.3). Runs before
    // enqueueing so oversized files never enter the pipeline.
    if (file.size > config.limits.maxFileSizeBytes) {
      throw new FileTooLargeError(maxFileSizeMessage());
    }

    // Enqueue a background `file` job. The original filename is the stable
    // sourceId (used for dedup); the job document holds no bytes.
    const { jobId } = await createJob(tenantId, {
      kind: "file",
      sourceId: file.originalname,
    });

    // Stage the uploaded bytes to a deterministic temp path keyed by the
    // jobId so the worker can read them for this job, then delete them.
    await mkdir(UPLOADS_DIR, { recursive: true });
    await writeFile(path.join(UPLOADS_DIR, jobId), file.buffer);

    // Return immediately — ingestion runs in the background (Requirement 4.1).
    res.status(202).json({ jobId });
  })
);
