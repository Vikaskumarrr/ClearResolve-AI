/**
 * Async ingestion runner — drives a single job from `running` to a terminal
 * state (`completed` or `failed`) by invoking the shared pipeline.
 *
 * The runner is the bridge between the persisted `jobs` collection (task 7.1)
 * and the shared `runIngestion` pipeline (task 6.x). It is intentionally thin:
 * it does not decide *what* to ingest (the route/worker created the job and
 * chose the source), only *how a job progresses*:
 *
 *   1. Mark the job `running` before any work begins (Requirement 4.4).
 *   2. Run the pipeline, forwarding each `onProgress` tick to the job document
 *      via `updateJobProgress` so the dashboard sees live counts (Req 4.4).
 *   3. On success, record the result counts and mark `completed` with a
 *      completion timestamp (Requirements 4.5, 9.2).
 *   4. On any throw, record the error message (a `StageError` names the failing
 *      stage) and mark `failed` with a completion timestamp (Req 4.6, 9.2).
 *
 * Payload-passing decision
 * ------------------------
 * A `Job` document (see `./types.ts`) stores only `kind` and `sourceId`, never
 * the file bytes or crawl parameters. Rather than widen the persisted document
 * to carry (potentially large) payloads, the runner takes the payload as a
 * second argument: `runJob(job, payload)`. The caller that created the job
 * (the upload/ingest routes in task 7.5, driven by the worker in task 7.4)
 * already holds the source in hand and passes it straight through. This keeps
 * the `jobs` collection small and the pipeline input assembled from the job's
 * own fields (`tenantId`, `sourceId`, `kind`) plus the caller-supplied payload.
 *
 * Requirements: 4.4, 4.5, 4.6, 9.2.
 */

import {
  runIngestion,
  type FilePayload,
  type UrlPayload,
} from "../ingestion/pipeline.js";
import {
  completeJob,
  failJob,
  markJobRunning,
  updateJobProgress,
} from "./jobManager.js";
import type { Job } from "./types.js";

/**
 * The source payload for a job, matching the pipeline's discriminated input.
 * A `file` job carries a `FilePayload`, a `url` job a `UrlPayload`; the runner
 * forwards it to `runIngestion` alongside the job's own `tenantId`/`sourceId`.
 */
export type JobPayload = FilePayload | UrlPayload;

/**
 * Run a single ingestion job to completion.
 *
 * Marks the job `running`, executes the shared pipeline for the job's source,
 * persisting progress as it advances, and finally records either the result
 * counts (`completed`) or the failure message (`failed`). This function does
 * not throw for pipeline failures — a failed run is a normal terminal state
 * recorded on the job document — so callers (the worker) can process the next
 * job without special-casing errors.
 *
 * @param job The persisted job to run; supplies `_id`, `tenantId`, `sourceId`,
 *   and `kind`.
 * @param payload The source to ingest (uploaded file bytes/path, or crawl
 *   parameters), passed through to the pipeline. See the module-level
 *   "Payload-passing decision" note for why this is a separate argument.
 */
export async function runJob(job: Job, payload: JobPayload): Promise<void> {
  // (1) Transition queued -> running before any work starts (Requirement 4.4).
  await markJobRunning(job._id);

  try {
    // (2) Run the shared pipeline, forwarding live progress to the job doc.
    const result = await runIngestion({
      tenantId: job.tenantId,
      sourceId: job.sourceId,
      kind: job.kind,
      payload,
      onProgress: async (progress) => {
        await updateJobProgress(job._id, progress);
      },
    });

    // (3) Success: record result counts + completedAt (Req 4.5, 9.2).
    await completeJob(job._id, {
      documents: result.documents,
      chunks: result.chunks,
    });
  } catch (error) {
    // (4) Failure: record the error message + completedAt (Req 4.6, 9.2). A
    // StageError's message names the stage that failed (load|chunk|embed|store).
    const message = error instanceof Error ? error.message : String(error);
    await failJob(job._id, message);
  }
}
