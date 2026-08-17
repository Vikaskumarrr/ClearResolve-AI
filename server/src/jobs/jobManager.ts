/**
 * Job_Manager — create, read, and list background ingestion jobs.
 *
 * This module is the single choke point for persisting and reading `jobs`
 * documents (see `./types.ts` and the `jobs` collection in design.md). Every
 * read is scoped by `tenantId` so a user can only ever see or fetch their own
 * jobs; a request for a job owned by another tenant (or one that does not
 * exist) is denied with an `AuthorizationError` (403) rather than leaking its
 * existence (Requirements 4.7, 6.5, 6.6).
 *
 * Responsibilities implemented here:
 *   - `createJob(tenantId, input)` — enqueue a new job (`status: "queued"`,
 *     zeroed progress, `createdAt`) and return its id (Requirements 4.1, 9.2).
 *   - `getJob(tenantId, jobId)` — ownership-checked fetch (Requirements 4.3,
 *     4.7, 6.6).
 *   - `listJobs(tenantId)` — the tenant's jobs, newest first, with status and
 *     summary metrics (Requirement 9.1).
 *
 * The async runner (task 7.3) drives a job from `queued` through `running` to
 * `completed`/`failed`; the small, unscoped update helpers it needs
 * (`markJobRunning`, `updateJobProgress`, `completeJob`, `failJob`) live here
 * too since they are trivial single-document updates over the same collection.
 *
 * Requirements: 4.1, 4.3, 4.7, 6.5, 6.6, 9.1, 9.2.
 */

import { ObjectId, type Document } from "mongodb";

import { getJobsCollection } from "../db/mongo.js";
import { AuthorizationError } from "../ingestion/errors.js";
import type { Job, JobProgress } from "./types.js";

/**
 * The `jobs` collection document shape. `Job` already models the fields; the
 * `Document` intersection satisfies the collection getter's `T extends
 * Document` constraint while keeping `_id` a string (Mongo `ObjectId`,
 * stringified — see `createJob`).
 */
type JobDocument = Job & Document;

/** Caller-supplied fields for a new job; the manager fills in the rest. */
export interface CreateJobInput {
  /** Whether this job ingests an uploaded file or a website URL. */
  kind: Job["kind"];
  /** Stable identifier of the source being ingested (used for dedup). */
  sourceId: string;
}

/**
 * Create and enqueue a new ingestion job for a tenant.
 *
 * The job is persisted with `status: "queued"`, zeroed progress counters, and
 * a `createdAt` timestamp (Requirement 9.2). The `_id` is a stringified Mongo
 * `ObjectId` so it is both globally unique and matches the `Job._id: string`
 * data model.
 *
 * @param tenantId Owning tenant; every later read is scoped by this value.
 * @param input Job `kind` and `sourceId`.
 * @returns `{ jobId }` — the new job's identifier (Requirement 4.1).
 */
export async function createJob(
  tenantId: string,
  input: CreateJobInput,
): Promise<{ jobId: string }> {
  const jobs = await getJobsCollection<JobDocument>();

  const jobId = new ObjectId().toHexString();
  const doc: JobDocument = {
    _id: jobId,
    tenantId,
    kind: input.kind,
    sourceId: input.sourceId,
    status: "queued",
    progress: { processedDocuments: 0, storedChunks: 0 },
    createdAt: new Date(),
  };

  await jobs.insertOne(doc);
  return { jobId };
}

/**
 * Fetch a single job, enforcing tenant ownership.
 *
 * The lookup is scoped by both `_id` and `tenantId`, so a job owned by another
 * tenant is indistinguishable from one that does not exist: either way no
 * document matches and an `AuthorizationError` (403) is thrown rather than
 * revealing the job's existence (Requirements 4.3, 4.7, 6.6).
 *
 * @throws {AuthorizationError} when no job with that id exists for the tenant.
 */
export async function getJob(tenantId: string, jobId: string): Promise<Job> {
  const jobs = await getJobsCollection<JobDocument>();

  const doc = await jobs.findOne({ _id: jobId, tenantId });
  if (!doc) {
    throw new AuthorizationError();
  }
  return doc as Job;
}

/**
 * List all jobs owned by a tenant, newest first.
 *
 * Results are scoped to the requesting tenant and sorted by `createdAt`
 * descending so the most recent jobs appear first. Each returned job carries
 * its status and summary metrics (`progress`, and `result` once completed) for
 * the dashboard (Requirement 9.1).
 */
export async function listJobs(tenantId: string): Promise<Job[]> {
  const jobs = await getJobsCollection<JobDocument>();

  const docs = await jobs
    .find({ tenantId })
    .sort({ createdAt: -1 })
    .toArray();
  return docs as Job[];
}

/**
 * Mark a queued job as `running`. Used by the runner (task 7.3) when it picks
 * up a job. Unscoped by tenant: the runner already operates on a trusted id.
 */
export async function markJobRunning(jobId: string): Promise<void> {
  const jobs = await getJobsCollection<JobDocument>();
  await jobs.updateOne({ _id: jobId }, { $set: { status: "running" } });
}

/** Overwrite a running job's live progress counters (Requirement 4.4). */
export async function updateJobProgress(
  jobId: string,
  progress: JobProgress,
): Promise<void> {
  const jobs = await getJobsCollection<JobDocument>();
  await jobs.updateOne({ _id: jobId }, { $set: { progress } });
}

/**
 * Mark a job `completed`, recording its result counts and completion
 * timestamp (Requirements 4.5, 9.2).
 */
export async function completeJob(
  jobId: string,
  result: { documents: number; chunks: number },
): Promise<void> {
  const jobs = await getJobsCollection<JobDocument>();
  await jobs.updateOne(
    { _id: jobId },
    { $set: { status: "completed", result, completedAt: new Date() } },
  );
}

/**
 * Mark a job `failed`, recording the error message and completion timestamp
 * (Requirements 4.6, 9.2).
 */
export async function failJob(jobId: string, error: string): Promise<void> {
  const jobs = await getJobsCollection<JobDocument>();
  await jobs.updateOne(
    { _id: jobId },
    { $set: { status: "failed", error, completedAt: new Date() } },
  );
}
