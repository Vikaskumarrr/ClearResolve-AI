/**
 * robots.txt handling for the website scraper.
 *
 * Before the crawler visits a candidate URL it must respect the site's
 * `robots.txt` access rules (Requirement 2.5). This module fetches a host's
 * `robots.txt` once, caches the parsed result per host (origin), and answers
 * allow/deny questions for individual URLs against the standard
 * `User-agent` / `Disallow` / `Allow` directives with longest-match precedence.
 *
 * Design choices:
 * - Dependency-free: a small, self-contained parser implements the subset of
 *   the robots exclusion standard the crawler needs (user-agent groups,
 *   Disallow/Allow, `*` wildcards and `$` end-anchors, longest-match wins with
 *   Allow winning ties). This avoids adding a runtime dependency for a
 *   well-bounded piece of logic.
 * - Retrieval uses the injected `fetch` (defaulting to the global `fetch`
 *   available on Node 20+), so no HTTP client dependency is required and tests
 *   can supply fixture `robots.txt` content without real network access.
 * - Per-host caching: the parsed rules for an origin are computed once and
 *   reused for every subsequent check against that host.
 *
 * Fail-open policy (documented):
 * - A network error or a 404 / other 4xx response means "no usable robots.txt"
 *   -> the site is treated as allow-all, which is the standard, expected
 *   behavior when a site publishes no rules.
 * - A 5xx (server error) response is treated as deny-all for that host: the
 *   server is in a bad state and the conservative, standards-aligned choice is
 *   to hold off crawling until it recovers.
 * - A 200 response is parsed; if it contains no rule that matches a URL, that
 *   URL is allowed.
 *
 * See design.md "Website Scraper" -> robots.txt. Requirements: 2.5.
 */

/** The subset of `fetch` this module relies on, so tests can inject a stub. */
export type FetchFn = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

/** A single Allow/Disallow directive from a user-agent group. */
interface RobotsRule {
  type: "allow" | "disallow";
  /** The raw path pattern (may contain `*` wildcards and a trailing `$`). */
  path: string;
}

/** One `User-agent` group and the rules that apply to it. */
interface RobotsGroup {
  /** Lower-cased user-agent tokens this group applies to. */
  agents: string[];
  rules: RobotsRule[];
}

/**
 * The cached, parsed representation of a host's robots.txt.
 *
 * - `allow-all` — no rules apply (missing/empty robots.txt or 4xx/network
 *   error); every URL is permitted.
 * - `deny-all` — the host returned a server error (5xx); no URL is permitted
 *   until the situation is re-evaluated.
 * - `rules` — parsed user-agent groups to evaluate per candidate URL.
 */
type ParsedRobots =
  | { mode: "allow-all" }
  | { mode: "deny-all" }
  | { mode: "rules"; groups: RobotsGroup[] };

/** Options for {@link createRobotsChecker}. */
export interface RobotsCheckerOptions {
  /**
   * Fetch implementation used to retrieve `robots.txt`. Defaults to the global
   * `fetch` (Node 20+). Injectable so tests can supply fixtures offline.
   */
  fetch?: FetchFn;
  /**
   * Default user-agent product token used when a check does not specify one.
   * Matched (case-insensitively) against the `User-agent` groups in
   * robots.txt.
   */
  userAgent?: string;
}

/** Public interface of the robots checker returned by the factory. */
export interface RobotsChecker {
  /**
   * Resolve whether `url` may be crawled according to the host's robots.txt.
   *
   * Fetches and caches the host's robots.txt on first use, then evaluates the
   * URL's path against the rules for `userAgent` (falling back to the checker's
   * default user-agent, then the `*` group).
   */
  isAllowed(url: string, userAgent?: string): Promise<boolean>;
}

/** Escape a literal string for safe inclusion in a `RegExp`. */
function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Test whether a URL path is matched by a robots.txt path pattern.
 *
 * Patterns are prefix matches by default; `*` matches any run of characters and
 * a trailing `$` anchors the match to the end of the path. An empty pattern
 * matches nothing (an empty `Disallow:` means "allow everything").
 */
function pathMatchesPattern(path: string, pattern: string): boolean {
  if (pattern === "") {
    return false;
  }

  const anchored = pattern.endsWith("$");
  const core = anchored ? pattern.slice(0, -1) : pattern;

  // Build a regex: escape everything, then turn the escaped `*` back into `.*`.
  const regexBody = escapeRegExp(core).replace(/\\\*/g, ".*");
  const regex = new RegExp(`^${regexBody}${anchored ? "$" : ""}`);
  return regex.test(path);
}

/**
 * Parse robots.txt text into user-agent groups.
 *
 * Consecutive `User-agent` lines share the rules that follow them. Lines are
 * case-insensitive on directive names; comments (`#`) and unknown directives
 * are ignored.
 */
function parseRobots(text: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  // Tracks whether the previous meaningful line was a User-agent, so a run of
  // consecutive agent lines accumulates into one shared group.
  let expectingAgents = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const withoutComment = rawLine.replace(/#.*$/, "");
    const line = withoutComment.trim();
    if (line === "") continue;

    const colon = line.indexOf(":");
    if (colon === -1) continue;

    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();

    if (field === "user-agent") {
      if (!expectingAgents || current === null) {
        current = { agents: [], rules: [] };
        groups.push(current);
        expectingAgents = true;
      }
      current.agents.push(value.toLowerCase());
      continue;
    }

    if (field === "allow" || field === "disallow") {
      expectingAgents = false;
      if (current === null) {
        // A rule with no preceding user-agent applies to all agents.
        current = { agents: ["*"], rules: [] };
        groups.push(current);
      }
      current.rules.push({ type: field, path: value });
    }
    // Other directives (sitemap, crawl-delay, host, ...) are ignored.
  }

  return groups;
}

/**
 * Select the group whose user-agent best matches `userAgent`.
 *
 * The most specific match wins: a group whose token appears in the crawler's
 * user-agent string is preferred over the wildcard `*` group, and among
 * matching non-wildcard tokens the longest one wins. Returns `null` when no
 * group (not even `*`) applies.
 */
function selectGroup(
  groups: RobotsGroup[],
  userAgent: string,
): RobotsGroup | null {
  const ua = userAgent.toLowerCase();
  let best: RobotsGroup | null = null;
  let bestScore = -1;

  for (const group of groups) {
    for (const agent of group.agents) {
      let score = -1;
      if (agent === "*") {
        score = 0;
      } else if (ua.includes(agent)) {
        // Longer, more specific tokens beat shorter ones and the `*` group.
        score = agent.length;
      }
      if (score > bestScore) {
        bestScore = score;
        best = group;
      }
    }
  }

  return best;
}

/**
 * Decide whether `path` is allowed for `group` using longest-match precedence.
 *
 * Among all rules whose pattern matches the path, the rule with the longest
 * pattern wins; when an Allow and a Disallow tie on length, Allow wins (the
 * standard tie-break). When no rule matches, the path is allowed.
 */
function isPathAllowedForGroup(group: RobotsGroup, path: string): boolean {
  let decision: "allow" | "disallow" | null = null;
  let bestLength = -1;

  for (const rule of group.rules) {
    if (!pathMatchesPattern(path, rule.path)) continue;

    const length = rule.path.length;
    if (
      length > bestLength ||
      (length === bestLength && rule.type === "allow")
    ) {
      bestLength = length;
      decision = rule.type;
    }
  }

  // No matching rule => allowed; an Allow win => allowed; a Disallow win => not.
  return decision !== "disallow";
}

/**
 * Create a robots.txt checker with per-host caching.
 *
 * @example
 * const robots = createRobotsChecker();
 * if (await robots.isAllowed("https://example.com/page")) {
 *   // safe to crawl
 * }
 */
export function createRobotsChecker(
  options: RobotsCheckerOptions = {},
): RobotsChecker {
  const fetchFn: FetchFn = options.fetch ?? (globalThis.fetch as FetchFn);
  const defaultUserAgent = options.userAgent ?? "*";

  if (typeof fetchFn !== "function") {
    throw new Error(
      "createRobotsChecker requires a fetch implementation (global fetch is unavailable; pass options.fetch)",
    );
  }

  // Cache keyed by origin (e.g. "https://example.com"). Stores a promise so
  // concurrent checks for the same host share a single in-flight fetch.
  const cache = new Map<string, Promise<ParsedRobots>>();

  async function fetchRobots(origin: string): Promise<ParsedRobots> {
    const robotsUrl = `${origin}/robots.txt`;
    let response: Response;
    try {
      response = await fetchFn(robotsUrl);
    } catch {
      // Network error: treat as no robots.txt -> allow all.
      return { mode: "allow-all" };
    }

    if (response.status >= 500) {
      // Server error: be conservative and hold off crawling this host.
      return { mode: "deny-all" };
    }

    if (!response.ok) {
      // 404 or other 4xx: no usable robots.txt -> allow all.
      return { mode: "allow-all" };
    }

    const text = await response.text();
    const groups = parseRobots(text);
    if (groups.length === 0) {
      return { mode: "allow-all" };
    }
    return { mode: "rules", groups };
  }

  function getRobots(origin: string): Promise<ParsedRobots> {
    let cached = cache.get(origin);
    if (!cached) {
      cached = fetchRobots(origin);
      cache.set(origin, cached);
    }
    return cached;
  }

  return {
    async isAllowed(url: string, userAgent?: string): Promise<boolean> {
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        // A URL we cannot even parse is not something we should crawl.
        return false;
      }

      const robots = await getRobots(parsed.origin);
      if (robots.mode === "allow-all") return true;
      if (robots.mode === "deny-all") return false;

      const group = selectGroup(robots.groups, userAgent ?? defaultUserAgent);
      if (group === null) return true;

      const path = `${parsed.pathname}${parsed.search}`;
      return isPathAllowedForGroup(group, path);
    },
  };
}

export default createRobotsChecker;
