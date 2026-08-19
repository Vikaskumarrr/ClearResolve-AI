/**
 * Client-side conversation search helper for the Chat_Sidebar.
 *
 * Kept as a colocated, dependency-free module so it can be imported both by
 * `Chat.tsx` and by a colocated property test without pulling in the page's
 * React tree.
 */

/** Minimal shape of a sidebar conversation entry (see design "Chat_Sidebar"). */
export interface Conversation {
  id: string;
  title: string;
  updatedAt?: string;
}

/**
 * Filter conversations by title using trimmed, case-insensitive substring
 * matching. An empty (or whitespace-only) query returns the full list
 * unchanged.
 *
 * Requirements: 10.1 (case-insensitive substring match), 10.2 (empty query
 * returns all conversations).
 */
export function filterByTitle<T extends { title: string }>(
  list: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (q === "") return list;
  return list.filter((c) => c.title.toLowerCase().includes(q));
}
