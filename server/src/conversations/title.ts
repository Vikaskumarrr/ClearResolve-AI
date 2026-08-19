/**
 * Auto-derive a human-readable conversation title from message content.
 *
 * A conversation's title is derived from its first user message (Requirement
 * 7.1) and truncated to a configured maximum length (Requirement 7.2). This is
 * a pure function so it is trivially testable and is applied only on the first
 * message (Requirement 7.3) by the store's `saveTurn`.
 */

import { config } from "../config.js";

/**
 * Derive a conversation title from message `content`.
 *
 * Takes the trimmed first line of the content and truncates it to `limit`
 * characters. Empty or whitespace-only content yields an empty string.
 *
 * @param content The message content to derive a title from.
 * @param limit Maximum title length in characters (defaults to the configured
 *   `titleMaxLength`).
 * @returns The derived title, never longer than `limit`.
 */
export function deriveTitle(
  content: string,
  limit: number = config.conversations.titleMaxLength
): string {
  const firstLine = content.trim().split(/\r?\n/, 1)[0]?.trim() ?? "";
  return firstLine.length > limit ? firstLine.slice(0, limit) : firstLine;
}
