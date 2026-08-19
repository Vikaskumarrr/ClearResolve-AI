/**
 * Data model for per-user chat conversation history.
 *
 * Two collections back this feature: `conversations` holds one document per
 * chat thread, and `messages` holds the ordered turns within each thread. Both
 * use a stringified `ObjectId` for `_id` (matching the `jobs` collection
 * convention) and are scoped by `userId`, which is the isolation boundary
 * returned by `requireUser(req)` (where `tenantId === userId`).
 *
 * These types mirror the "Data Models" section of design.md.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4.
 */

/**
 * A persisted chat conversation in the `conversations` collection.
 *
 * Every read/write is scoped by `userId`, so cross-user access is structurally
 * impossible. The title is auto-derived from the first user message.
 */
export interface Conversation {
  /** Unique conversation identifier (Mongo `_id`, stringified). */
  _id: string;
  /** Owning user — every read/write is scoped by this (Requirement 2.3). */
  userId: string;
  /** Human-readable label; auto-derived from the first user message (Req 7). */
  title: string;
  /**
   * Monotonic per-conversation sequence counter. The next message's `seq` is
   * assigned from this value via an atomic `$inc`, guaranteeing a strict,
   * gap-tolerant insertion order even when a user + assistant turn is saved in
   * the same millisecond (Requirements 1.4, 6.4).
   */
  messageCount: number;
  /** Creation timestamp. */
  createdAt: Date;
  /** Last-updated timestamp; bumped on every message persist (Req 6.3). */
  updatedAt: Date;
}

/** Who authored a message turn. */
export type MessageRole = "user" | "assistant";

/**
 * A citation stored on an assistant message. Reuses the `Citation` shape from
 * `server/src/chat.ts`.
 */
export interface StoredCitation {
  /** Source document identifier. */
  source: string;
  /** Text snippet from the source. */
  snippet: string;
}

/**
 * A single persisted turn in the `messages` collection.
 *
 * `userId` is denormalized onto the message so isolation and retention deletes
 * can be scoped without a join (Requirements 2.3, 11.2).
 */
export interface Message {
  /** Unique message identifier (Mongo `_id`, stringified). */
  _id: string;
  /** The conversation this message belongs to. */
  conversationId: string;
  /**
   * Denormalized owner id. Also stored on the message so isolation and
   * retention deletes can be scoped without a join (Requirements 2.3, 11.2).
   */
  userId: string;
  /** Who authored the turn. */
  role: MessageRole;
  /** Textual content of the turn. */
  content: string;
  /**
   * Assistant citations. Always an array; `[]` for user messages and for
   * assistant answers with no sources (Requirement 1.5).
   */
  citations: StoredCitation[];
  /** Strict insertion order within the conversation (Requirements 1.4, 6.4). */
  seq: number;
  /** Creation timestamp. */
  createdAt: Date;
}
