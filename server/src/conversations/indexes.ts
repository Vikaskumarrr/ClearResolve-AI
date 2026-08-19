/**
 * Idempotent index bootstrap for the chat-history collections.
 *
 * `ensureConversationIndexes` is safe to call on every startup: MongoDB's
 * `createIndex` is a no-op when an index with the same key and options already
 * exists, so repeated invocations neither error nor rebuild.
 *
 * The indexes back the hot read paths and the retention sweep:
 *   - `conversations {userId:1, updatedAt:-1}` — list a user's conversations
 *     most-recently-updated first (Requirement 4.1).
 *   - `conversations {updatedAt:1}` — range-scan expired conversations during
 *     the retention sweep (Requirement 11.2).
 *   - `messages {conversationId:1, seq:1}` — fetch a conversation's messages in
 *     strict insertion order (Requirement 5.1).
 *   - `messages {userId:1}` — scope cascade/retention deletes by owner without
 *     a join (Requirement 11.2).
 *
 * Requirements: 4.1, 5.1, 11.2.
 */

import {
  getConversationsCollection,
  getMessagesCollection,
} from "../db/mongo.js";
import type { Conversation, Message } from "./types.js";

/**
 * Create the indexes that back conversation listing, message ordering, and the
 * retention sweep. Idempotent: existing indexes are left untouched.
 */
export async function ensureConversationIndexes(): Promise<void> {
  const conversations = await getConversationsCollection<Conversation>();
  const messages = await getMessagesCollection<Message>();

  await Promise.all([
    conversations.createIndex({ userId: 1, updatedAt: -1 }),
    conversations.createIndex({ updatedAt: 1 }),
    messages.createIndex({ conversationId: 1, seq: 1 }),
    messages.createIndex({ userId: 1 }),
  ]);
}
