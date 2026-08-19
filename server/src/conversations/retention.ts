/**
 * Retention_Service — periodically expires conversations (and their messages)
 * whose age since last update exceeds the configured retention window.
 *
 * **Strategy: scheduled sweep, not a MongoDB TTL index.** A TTL index was
 * rejected for two reasons (see design.md "Retention_Service"):
 *   1. **No cascade.** A TTL index only deletes the document it indexes, which
 *      would orphan every expired conversation's messages (they live in a
 *      separate collection). Requirement 11.2 requires removing the conversation
 *      *and all its messages*.
 *   2. **Not runtime-configurable.** `expireAfterSeconds` is fixed at index
 *      creation; the sweep reads `config.conversations.retentionDays` at runtime
 *      and honors the `RETENTION_DAYS` override immediately (Requirement 11.1).
 *
 * The sweep runs inside the existing long-running worker process
 * (`server/src/worker.ts`), the natural home for periodic background work.
 *
 * Requirements: 11.1, 11.2, 11.3.
 */

import { config } from "../config.js";
import { expireOlderThan } from "./store.js";

/**
 * Compute the retention cutoff from `now` and expire everything older.
 *
 * The cutoff is `now - retentionDays`; `store.expireOlderThan` then deletes
 * conversations whose `updatedAt` is strictly before the cutoff (and their
 * messages), leaving conversations within the window untouched (Requirements
 * 11.2, 11.3). `now` is injectable so the sweep is deterministically testable.
 *
 * @param now The reference "current time"; defaults to `new Date()`.
 * @returns The number of conversations and messages deleted.
 */
export async function sweepExpiredConversations(
  now: Date = new Date(),
): Promise<{ conversations: number; messages: number }> {
  const cutoff = new Date(
    now.getTime() - config.conversations.retentionDays * 24 * 60 * 60 * 1000,
  );
  return expireOlderThan(cutoff);
}

/**
 * Start the periodic retention sweep on the configured interval.
 *
 * Each tick runs `sweepExpiredConversations` and swallows any error (logging
 * it) so a transient failure never crashes the worker or halts the schedule.
 *
 * @returns The interval handle so callers may `clearInterval` on shutdown.
 */
export function startRetentionScheduler(): NodeJS.Timeout {
  return setInterval(() => {
    void sweepExpiredConversations().catch((e) =>
      console.error("retention sweep failed:", e),
    );
  }, config.conversations.retentionSweepIntervalMs);
}
