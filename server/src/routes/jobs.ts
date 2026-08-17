import { Router, type Request, type Response } from "express";

import { requireUser } from "../auth/session.js";
import { getJob, listJobs } from "../jobs/jobManager.js";
import { handleRoute } from "./handleRoute.js";

/**
 * Job status API used by the ingestion dashboard.
 *
 * Two read-only endpoints, both authenticated and tenant-scoped:
 *
 *   - `GET /api/jobs` — list the caller's jobs, newest first, each with its
 *     status and summary metrics (live `progress` and, once finished, `result`
 *     counts). Backs the dashboard's job list (Requirement 9.1).
 *   - `GET /api/jobs/:id` — fetch a single job's status/progress. The lookup is
 *     ownership-checked in `getJob`, which throws `AuthorizationError` (403)
 *     when the job belongs to another tenant or does not exist, so a job's
 *     existence is never leaked (Requirements 4.3, 4.7). This is the endpoint
 *     the dashboard polls while a job is running (Requirement 9.3).
 *
 * Both handlers authenticate FIRST via `requireUser(req)` (401 when there is no
 * session). Typed `AppError`s are mapped to a structured
 * `{ error: { code, message } }` response with the error's own status by the
 * shared `handleRoute` wrapper (Requirement 8.5).
 */
export const jobsRouter = Router();

jobsRouter.get(
  "/jobs",
  handleRoute(async (req: Request, res: Response) => {
    // Authenticate FIRST: resolve the tenant from the session (401 if absent).
    const { tenantId } = requireUser(req);

    // Tenant-scoped list, newest first, with status + summary metrics.
    const jobs = await listJobs(tenantId);
    res.status(200).json({ jobs });
  })
);

jobsRouter.get(
  "/jobs/:id",
  handleRoute(async (req: Request, res: Response) => {
    // Authenticate FIRST: resolve the tenant from the session (401 if absent).
    const { tenantId } = requireUser(req);

    // Ownership-checked fetch: `getJob` throws `AuthorizationError` (403) for
    // a job owned by another tenant or one that does not exist, rather than
    // revealing its existence (Requirements 4.3, 4.7).
    const jobId = String(req.params.id);
    const job = await getJob(tenantId, jobId);
    res.status(200).json({ job });
  })
);
