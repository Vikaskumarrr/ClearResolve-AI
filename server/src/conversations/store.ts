/**
 * Conversation_Store — the single choke point for reading and writing
 * `conversations` and `messages`.
 *
 * Every function takes `userId` first and every Mongo query includes `userId`,
 * so a document owned by another user can never be read, updated, or deleted —
 * a non-owned or missing id is indistinguishable from a truly absent one and
 * yields `NotFoundError` (Requirements 2.3, 2.4). This mirrors the
 * ownership-scoped pattern in `jobManager.ts`, except conversations return
 * **404** (not 403) per Requirement 2.4 so existence is not leaked.
 *
 * `_id` values are stringified Mongo `ObjectId`s (`new ObjectId().toHexString()`),
 * matching the convention established for `jobs` (see `jobs/jobManager.ts`).
 *
 * This module will later gain `saveTurn`, `renameConversation`,
 * `deleteConversation`, and `expireOlderThan` (tasks 3.2/3.3); the current file
 * implements the four read/create functions.
 *
 * Requirements: 1.1, 2.3, 2.4, 4.1, 4.2, 5.1, 5.2, 5.3.
 */

import { ObjectId, type Document } from "mongodb";

import {
  getConversationsCollection,
  getMessagesCollection,
} from "../db/mongo.js";
import { NotFoundError } from "../ingestion/errors.js";
import { deriveTitle } from "./title.js";
import type { Conversation, Message, StoredCitation } from "./types.js";

/**
 * The `conversations` collection document shape. `Conversation` already models
 * the fields; the `Document` intersection satisfies the collection getter's
 * `T extends Document` constraint while keeping `_id` a string.
 */
type ConversationDocument = Conversation & Document;

/** The `messages` collection document shape (see `ConversationDocument`). */
type MessageDocument = Message & Document;

/**
 * Create a new, empty conversation owned by `userId`.
 *
 * The conversation starts with a placeholder (empty string) title — it is set
 * from the first user message by `saveTurn` (Requirement 7.1) — a zeroed
 * `messageCount`, and equal `createdAt`/`updatedAt` timestamps. The `_id` is a
 * stringified `ObjectId` so it is globally unique and matches
 * `Conversation._id: string`.
 *
 * @param userId Owning user; every later read/write is scoped by this value.
 * @returns The created conversation (Requirements 1.1, 3.3).
 */
export async function createConversation(
  userId: string,
): Promise<Conversation> {
  const conversations = await getConversationsCollection<ConversationDocument>();

  const now = new Date();
  const doc: ConversationDocument = {
    _id: new ObjectId().toHexString(),
    userId,
    title: "",
    messageCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  await conversations.insertOne(doc);
  return doc as Conversation;
}

/**
 * List all conversations owned by `userId`, most-recently-updated first.
 *
 * Results are scoped to the requesting user and sorted by `updatedAt`
 * descending so the freshest conversations appear at the top of the sidebar
 * (Requirements 4.1, 4.2).
 */
export async function listConversations(
  userId: string,
): Promise<Conversation[]> {
  const conversations = await getConversationsCollection<ConversationDocument>();

  const docs = await conversations
    .find({ userId })
    .sort({ updatedAt: -1 })
    .toArray();
  return docs as Conversation[];
}

/**
 * Fetch a single conversation, enforcing ownership.
 *
 * The lookup is scoped by both `_id` and `userId`, so a conversation owned by
 * another user is indistinguishable from one that does not exist: either way
 * no document matches and a `NotFoundError` (404) is thrown rather than
 * revealing the conversation's existence (Requirements 2.3, 2.4).
 *
 * @throws {NotFoundError} when no conversation with that id exists for the user.
 */
export async function getConversation(
  userId: string,
  id: string,
): Promise<Conversation> {
  const conversations = await getConversationsCollection<ConversationDocument>();

  const doc = await conversations.findOne({ _id: id, userId });
  if (!doc) {
    throw new NotFoundError();
  }
  return doc as Conversation;
}

/**
 * Return a conversation's messages in insertion order.
 *
 * Ownership is asserted first via `getConversation` (which throws
 * `NotFoundError` for a missing or non-owned id), then the conversation's
 * messages are read scoped by `userId` and sorted by `seq` ascending so two
 * turns saved in the same millisecond still read back deterministically
 * (Requirements 2.4, 5.1, 5.2, 5.3).
 *
 * @throws {NotFoundError} when the conversation is absent or not owned.
 */
export async function getMessages(
  userId: string,
  id: string,
): Promise<Message[]> {
  // Assert ownership before returning any messages (Requirement 2.4).
  await getConversation(userId, id);

  const messages = await getMessagesCollection<MessageDocument>();
  const docs = await messages
    .find({ conversationId: id, userId })
    .sort({ seq: 1 })
    .toArray();
  return docs as Message[];
}

/**
 * Persist one chat turn — the user message followed by the assistant reply —
 * to a conversation, atomically and in order.
 *
 * The two `seq` values are reserved up front by a single atomic
 * `findOneAndUpdate({ _id, userId }, { $inc: { messageCount: 2 } })`. That one
 * operation does three things at once:
 *
 *   1. **Asserts ownership.** The filter is scoped by `userId`, so a missing or
 *      non-owned id matches nothing and yields `NotFoundError` (404) — existence
 *      is never leaked (Requirements 2.4, 6.1).
 *   2. **Reserves ordering.** `returnDocument: "before"` returns the document as
 *      it was *before* the increment, so its `messageCount` `n` is the next free
 *      slot: the user message takes `seq = n` and the assistant `seq = n + 1`.
 *      Because the counter moves atomically, two turns racing in the same
 *      millisecond still get disjoint, strictly ordered `seq` values, and the
 *      user turn always precedes its assistant turn (Requirements 1.4, 6.4).
 *
 * Both messages are then inserted (the assistant with its citations, `[]` for
 * the user), `updatedAt` is bumped so the conversation floats to the top of the
 * list (Requirement 6.3), and the title is derived from the user message **only
 * when this is the first turn** (pre-update `messageCount === 0`), leaving it
 * stable thereafter (Requirements 7.1, 7.3).
 *
 * @param userId Owning user; scopes the ownership check and both writes.
 * @param id Target conversation id.
 * @param turn The user content and the assistant content + citations to save.
 * @returns The two persisted messages and the conversation's final title.
 * @throws {NotFoundError} when the conversation is absent or not owned.
 */
export async function saveTurn(
  userId: string,
  id: string,
  turn: {
    user: { content: string };
    assistant: { content: string; citations: StoredCitation[] };
  },
): Promise<{ userMessage: Message; assistantMessage: Message; title: string }> {
  const conversations = await getConversationsCollection<ConversationDocument>();
  const messages = await getMessagesCollection<MessageDocument>();

  // Atomically reserve two seq values and assert ownership. The returned
  // document is the pre-update state, so its `messageCount` (n) is the next
  // free seq: user → n, assistant → n + 1.
  const before = await conversations.findOneAndUpdate(
    { _id: id, userId },
    { $inc: { messageCount: 2 } },
    { returnDocument: "before" },
  );
  if (!before) {
    throw new NotFoundError();
  }

  const n = before.messageCount;
  const now = new Date();

  const userMessage: MessageDocument = {
    _id: new ObjectId().toHexString(),
    conversationId: id,
    userId,
    role: "user",
    content: turn.user.content,
    citations: [],
    seq: n,
    createdAt: now,
  };
  const assistantMessage: MessageDocument = {
    _id: new ObjectId().toHexString(),
    conversationId: id,
    userId,
    role: "assistant",
    content: turn.assistant.content,
    citations: turn.assistant.citations,
    seq: n + 1,
    createdAt: now,
  };

  await messages.insertMany([userMessage, assistantMessage]);

  // Bump updatedAt so this conversation sorts first (Requirement 6.3), and set
  // the derived title only on the first turn (Requirements 7.1, 7.3).
  const isFirstTurn = n === 0;
  const title = isFirstTurn ? deriveTitle(turn.user.content) : before.title;
  const update: { updatedAt: Date; title?: string } = { updatedAt: now };
  if (isFirstTurn) {
    update.title = title;
  }
  await conversations.updateOne({ _id: id, userId }, { $set: update });

  return {
    userMessage: userMessage as Message,
    assistantMessage: assistantMessage as Message,
    title,
  };
}

/**
 * Rename a conversation, enforcing ownership.
 *
 * The update is scoped by both `_id` and `userId` via `findOneAndUpdate`, so a
 * conversation owned by another user (or a missing id) matches nothing and
 * yields `NotFoundError` (404) rather than revealing existence (Requirements
 * 2.3, 2.4). `updatedAt` is bumped alongside the new title, and
 * `returnDocument: "after"` returns the freshly updated conversation.
 *
 * @param userId Owning user; scopes the ownership check and the write.
 * @param id Target conversation id.
 * @param title The new (already-validated, non-blank) title.
 * @returns The updated conversation (Requirement 8.1).
 * @throws {NotFoundError} when the conversation is absent or not owned.
 */
export async function renameConversation(
  userId: string,
  id: string,
  title: string,
): Promise<Conversation> {
  const conversations = await getConversationsCollection<ConversationDocument>();

  const doc = await conversations.findOneAndUpdate(
    { _id: id, userId },
    { $set: { title, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!doc) {
    throw new NotFoundError();
  }
  return doc as Conversation;
}

/**
 * Delete a conversation and cascade-delete its messages, enforcing ownership.
 *
 * The conversation is deleted scoped by `{ _id: id, userId }`; if nothing
 * matched (`deletedCount === 0`) the id is absent or not owned, so
 * `NotFoundError` (404) is thrown and no cascade runs (Requirements 2.3, 2.4).
 * Otherwise the conversation's messages are removed by
 * `{ conversationId: id, userId }` so no orphans remain (Requirement 9.1).
 *
 * @param userId Owning user; scopes both deletes.
 * @param id Target conversation id.
 * @throws {NotFoundError} when the conversation is absent or not owned.
 */
export async function deleteConversation(
  userId: string,
  id: string,
): Promise<void> {
  const conversations = await getConversationsCollection<ConversationDocument>();
  const messages = await getMessagesCollection<MessageDocument>();

  const result = await conversations.deleteOne({ _id: id, userId });
  if (result.deletedCount === 0) {
    throw new NotFoundError();
  }

  await messages.deleteMany({ conversationId: id, userId });
}

/**
 * Global retention sweep: delete every conversation last updated before
 * `cutoff`, then cascade-delete their messages.
 *
 * Unlike the other store functions this is **not** `userId`-scoped — it is a
 * system-wide retention sweep run by the Retention_Service, so it partitions
 * purely by age (Requirements 11.2, 11.3). To cascade correctly the expired
 * conversation ids are collected first, the conversations are deleted, and then
 * their messages are removed by `{ conversationId: { $in: ids } }`. Collecting
 * the ids before deleting avoids orphaning messages whose conversation is gone.
 *
 * @param cutoff Conversations with `updatedAt < cutoff` are expired.
 * @returns The number of conversations and messages deleted.
 */
export async function expireOlderThan(
  cutoff: Date,
): Promise<{ conversations: number; messages: number }> {
  const conversations = await getConversationsCollection<ConversationDocument>();
  const messages = await getMessagesCollection<MessageDocument>();

  // Collect the expired conversation ids before deleting so the message
  // cascade can target them even after their conversations are gone.
  const expired = await conversations
    .find({ updatedAt: { $lt: cutoff } }, { projection: { _id: 1 } })
    .toArray();
  const ids = expired.map((doc) => doc._id);

  const conversationsResult = await conversations.deleteMany({
    updatedAt: { $lt: cutoff },
  });

  let messagesDeleted = 0;
  if (ids.length > 0) {
    const messagesResult = await messages.deleteMany({
      conversationId: { $in: ids },
    });
    messagesDeleted = messagesResult.deletedCount;
  }

  return {
    conversations: conversationsResult.deletedCount,
    messages: messagesDeleted,
  };
}
