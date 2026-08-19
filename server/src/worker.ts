/**
 * Dedicated Mongo-polling ingestion worker (design Option A).
 *
 * This is a standalone, long-running Node process — separate from the Express
 * API (`src/index.ts`) — whose sole job is to drain the `jobs` collection. It
 * repeatedly claims the next `queued` job, builds the pipeline payload from the
 * job's own fields, and runs it to a terminal state via `runJob` (task 7.3).
 *
 * Why a separate process (Option A)?
 * ----------------------------------
 * URL ingestion crawls pages with Playwright, which launches a real Chromium
 * browser. Running that inside the API request/response cycle (or inside a
 * serverless function) is fragile and resource-heavy. A dedicated long-running
 * process can safely launch Playwright natively and own the browser lifecycle,
 * while the API stays responsive and merely enqueues jobs (Requirements 4.1,
 * 4.4). The API and this worker share nothing but the `jobs` collection.
 *
 * OPS / SECURITY NOTES
 * --------------------
 *   - This process is the ONLY place URL crawls execute. Its runtime MUST have
 *     Chromium installed: run `npx playwright install chromium` in the worker
 *     environment (image/host) before starting, or crawls will fail at launch.
 *   - The worker trusts the `jobs` documents it reads; those were written by the
 *     authenticated upload/ingest routes (task 7.5), which set `tenantId` from
 *     the session. The worker performs no auth of its own — do not expose it.
 *   - File jobs read uploaded bytes from a shared temp dir (see SHARED CONTRACT
 *     below); that dir must be reachable by both the API and this worker.
 *
 * SHARED CONTRACT WITH THE ROUTES (task 7.5)
 * ------------------------------------------
 * The routes and this worker agree on how a persisted `Job` maps to a pipeline
 * payload — see {@link buildPayloadForJob}:
 *   - `file` job: the upload route wrote the raw bytes to
 *     `os.tmpdir()/rag-uploads/<jobId>` (filename == jobId, no extension) and
 *     set `sourceId` to the ORIGINAL filename. Payload:
 *     `{ filename: job.sourceId, path: <that temp path> }`.
 *   - `url`  job: the ingest route set `sourceId` to the start URL. Payload:
 *     `{ startUrl: job.sourceId }`; crawl caps default from `config.crawl`
 *     inside the pipeline.
 * After a file job finishes (success OR failure) the worker best-effort deletes
 * the temp file so uploads don't accumulate on disk.
 *
 * Requirements: 4.1 (enqueue/pick up jobs), 4.4 (drive running jobs).
 */

import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import dotenv from "dotenv";

// Load the shared `.env` at the repo root BEFORE importing any config-reading
// module (config.ts calls requireEnv at module-evaluation time). This mirrors
// `src/index.ts`; this file lives at server/src/, so the repo root is two
// levels up. Everything that transitively reads `config` is dynamically
// imported below, after dotenv has populated the environment.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import type { Job } from "./jobs/types.js";
import type { JobPayload } from "./jobs/runner.js";

/** Directory shared with the upload route where file-job bytes are staged. */
const UPLOAD_TMP_DIR = path.join(os.tmpdir(), "rag-uploads");

/** How long to sleep between polls when the queue is empty (ms). */
const POLL_INTERVAL_MS = 1000;

/**
 * Map a persisted job to the pipeline payload its kind requires.
 *
 * This is the pure, testable heart of the SHARED CONTRACT with the routes (see
 * the module doc): it never touches Mongo, the filesystem, or the network, so
 * it can be unit-tested in isolation. The polling loop keeps its own logic thin
 * and delegates the job -> payload decision here.
 *
 *   - `file` -> `FilePayload` pointing at the staged temp file (named by the
 *     job id) with the original filename carried in `filename`.
 *   - `url`  -> `UrlPayload` with the start URL; crawl caps default in-pipeline.
 *
 * @param job The claimed job (`_id`, `kind`, `sourceId`, ...).
 * @returns The payload to hand to `runJob(job, payload)`.
 */
export function buildPayloadForJob(job: Job): JobPayload {
  if (job.kind === "file") {
    // sourceId is the ORIGINAL filename; the bytes were staged under the job id.
    return {
      filename: job.sourceId,
      path: path.join(UPLOAD_TMP_DIR, job._id),
    };
  }
  // kind === "url": sourceId is the start URL (Requirement 2.1).
  return { startUrl: job.sourceId };
}

/** Resolve after `ms` milliseconds. Used to pace polling when idle. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Atomically claim the next queued job, flipping it to `running` in one
 * operation so two worker instances can never pick up the same job. Oldest
 * first (`sort: { createdAt: 1 }`) for FIFO fairness. `runJob` also calls
 * `markJobRunning`, which is idempotent, so the double transition is harmless.
 *
 * @returns The claimed job (already `running`), or `null` when the queue is
 *   empty.
 */
async function claimNextJob(): Promise<Job | null> {
  const { getJobsCollection } = await import("./db/mongo.js");
  const jobs = await getJobsCollection<Job>();

  const claimed = await jobs.findOneAndUpdate(
    { status: "queued" },
    { $set: { status: "running" } },
    { sort: { createdAt: 1 }, returnDocument: "after" },
  );

  return (claimed as Job | null) ?? null;
}

/** Best-effort removal of a file-job's staged temp file (ignores ENOENT). */
async function cleanupFileJob(job: Job): Promise<void> {
  if (job.kind !== "file") {
    return;
  }
  const tmpPath = path.join(UPLOAD_TMP_DIR, job._id);
  try {
    await fs.unlink(tmpPath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      console.error(`worker: failed to delete temp upload ${tmpPath}:`, error);
    }
  }
}

/**
 * Process exactly one claimed job: build its payload, run it to a terminal
 * state, then clean up. `runJob` does not throw on pipeline failure (it records
 * `failed` on the job), so any throw here is unexpected infrastructure trouble;
 * the caller wraps this in try/catch so one bad job never kills the loop.
 */
async function processJob(job: Job): Promise<void> {
  const { runJob } = await import("./jobs/runner.js");
  try {
    const payload = buildPayloadForJob(job);
    await runJob(job, payload);
  } finally {
    // Always reclaim disk for file jobs, whether the run succeeded or failed.
    await cleanupFileJob(job);
  }
}

/** Flipped by the shutdown handler so the poll loop exits cleanly. */
let running = true;

/**
 * The polling loop: claim -> process -> repeat, sleeping briefly whenever the
 * queue is empty. Each iteration is wrapped in try/catch so a single failing
 * job (or a transient Mongo error) is logged and skipped rather than crashing
 * the worker (Requirement 4.4).
 */
async function pollLoop(): Promise<void> {
  console.log("worker: polling for queued ingestion jobs...");
  while (running) {
    try {
      const job = await claimNextJob();
      if (!job) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }
      console.log(`worker: claimed job ${job._id} (kind=${job.kind})`);
      await processJob(job);
      console.log(`worker: finished job ${job._id}`);
    } catch (error) {
      // Never let one iteration take down the loop.
      console.error("worker: error while processing a job:", error);
      await sleep(POLL_INTERVAL_MS);
    }
  }
}

/**
 * Install graceful-shutdown handlers: stop the loop, close the shared Mongo
 * client, and exit. Registered for both SIGINT (Ctrl-C) and SIGTERM (container
 * stop). Guarded so a second signal during shutdown does not double-close.
 */
function installShutdownHandlers(): void {
  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    running = false;
    console.log(`worker: received ${signal}, shutting down...`);
    try {
      const { getMongoClient } = await import("./db/mongo.js");
      const client = await getMongoClient();
      await client.close();
    } catch (error) {
      console.error("worker: error during shutdown:", error);
    } finally {
      process.exit(0);
    }
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

async function main(): Promise<void> {
  installShutdownHandlers();

  // Bootstrap chat-history indexes and start the retention sweep before the
  // poll loop. These modules read `config`, so they are dynamically imported
  // here (after dotenv has populated the environment) to preserve the
  // dotenv-before-config ordering established at the top of this file.
  const { ensureConversationIndexes } = await import(
    "./conversations/indexes.js"
  );
  const { startRetentionScheduler } = await import(
    "./conversations/retention.js"
  );
  await ensureConversationIndexes();
  startRetentionScheduler();

  await pollLoop();
}

// Only run the loop when executed directly (not when imported by tests). The
// guard compares this module's URL to the entry script argv[1] resolved to a
// file:// URL, so importing `buildPayloadForJob` never starts the poll loop.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("worker: fatal error:", error);
    process.exit(1);
  });
}
