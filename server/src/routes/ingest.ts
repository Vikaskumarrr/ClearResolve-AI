import { Router, type Request, type Response } from "express";

import { requireUser } from "../auth/session.js";
import { createJob } from "../jobs/jobManager.js";
import { ValidationError } from "../ingestion/errors.js";
import { handleRoute } from "./handleRoute.js";

/**
 * POST /api/ingest
 * JSON body `{ url: string }`.
 *
 * Enqueues a background `url` job that crawls/ingests a website starting from
 * the given URL, then returns immediately with the new job's id (Requirement
 * 4.1). Like the upload route, this handler does NOT run ingestion inline: a
 * separate worker process (see `jobs/runner.ts`) polls Mongo for queued jobs
 * and drives the shared pipeline out of band.
 *
 * The URL is validated up front with the WHATWG `URL` parser and used as the
 * job's `sourceId`, so re-ingesting the same site replaces its chunks (dedup)
 * rather than duplicating them.
 *
 * Success: 202 { jobId: <string> }
 * Errors:  { error: { code, message } } with the status of the typed error
 *          (401 unauthenticated / 400 validation), mapped by the shared
 *          `handleRoute` wrapper (Requirement 8.5).
 */
export const ingestRouter = Router();

ingestRouter.post(
  "/ingest",
  handleRoute(async (req: Request, res: Response) => {
    // Authenticate FIRST (Requirements 6.1, 6.2): resolve the tenant from the
    // session before doing any work. Throws `AuthError` (401) when there is
    // no logged-in user, mapped by `handleRoute` to a structured 401.
    const { tenantId } = requireUser(req);

    const url: unknown = req.body?.url;

    // Validate the URL (400): require a non-empty string that parses as a
    // well-formed absolute URL.
    if (typeof url !== "string" || url.trim().length === 0) {
      throw new ValidationError("A url is required");
    }
    try {
      // eslint-disable-next-line no-new
      new URL(url);
    } catch {
      throw new ValidationError(`Invalid url: ${url}`);
    }

    // Enqueue a background `url` job. The URL is the stable sourceId (used
    // for dedup); the job document holds no crawl state.
    const { jobId } = await createJob(tenantId, {
      kind: "url",
      sourceId: url,
    });

    // Return immediately — ingestion runs in the background (Requirement 4.1).
    res.status(202).json({ jobId });
  })
);
