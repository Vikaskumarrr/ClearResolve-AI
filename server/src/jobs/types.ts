/**
 * Job model for the background ingestion queue.
 *
 * A `Job` is one unit of work in the `jobs` collection: a request to ingest a
 * single source (an uploaded file or a website URL) for a tenant. The worker
 * polls for `queued` jobs, the runner drives one from `running` to either
 * `completed` (with result counts) or `failed` (with an error message), and the
 * job API/dashboard read status and `progress` to report live progress.
 *
 * These types mirror the `jobs` collection data model in design.md
 * ("Data Models"). `JobProgress` is the canonical shape consumed by the
 * pipeline's `onProgress` callback (see `../ingestion/pipeline.ts`).
 *
 * Requirements: 4.2.
 */

/** The lifecycle states a job moves through, in order. */
export type JobStatus = "queued" | "running" | "completed" | "failed";

/**
 * Live progress reported as ingestion advances. Monotonically increasing across
 * a run; the pipeline's `onProgress` callback emits values of this shape.
 */
export interface JobProgress {
  /** Number of loaded documents processed so far. */
  processedDocuments: number;
  /** Number of chunks stored so far. */
  storedChunks: number;
}

/**
 * A single ingestion job persisted in the `jobs` collection.
 *
 * Scoped to a tenant (`tenantId`) so ownership checks can deny cross-tenant
 * access. `result` is set only on success and `completedAt`/`error` only once
 * the job leaves the `running` state.
 */
export interface Job {
  /** Unique job identifier (Mongo `_id`, stringified). */
  _id: string;
  /** Owning tenant — every read is scoped by this (Requirement 6.5, 6.6). */
  tenantId: string;
  /** Whether this job ingests an uploaded file or a website URL. */
  kind: "file" | "url";
  /** Stable identifier of the source being ingested, used for dedup. */
  sourceId: string;
  /** Current lifecycle state. */
  status: JobStatus;
  /** Live progress counters, updated as the pipeline advances. */
  progress: JobProgress;
  /** Final counts, present only when `status` is `completed`. */
  result?: { documents: number; chunks: number };
  /** Failure message, present only when `status` is `failed`. */
  error?: string;
  /** When the job was created and enqueued. */
  createdAt: Date;
  /** When the job finished (completed or failed); absent while queued/running. */
  completedAt?: Date;
}
