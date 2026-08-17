/**
 * Crawl frontier — the breadth-first scheduling core of the website scraper.
 *
 * The frontier owns the queue of pages still to visit and enforces the three
 * crawl caps so the scraper (task 8.3) can stay focused on rendering and text
 * extraction. It is deliberately pure and network-free: it knows nothing about
 * Playwright, HTTP, or robots.txt. You seed it with a start URL, ask it for the
 * next page via `next()`, and feed the links you discover on that page back in
 * via `enqueue(links, parentDepth)`. All caps and filters are applied at
 * enqueue/dequeue time:
 *
 * - **maxDepth** (Requirement 2.3): a link discovered on a page at depth `d` is
 *   enqueued at depth `d + 1`; links whose resulting depth would exceed
 *   `maxDepth` are never enqueued, so the crawl never follows links beyond the
 *   configured depth.
 * - **maxPages** (Requirement 2.4): `next()` stops handing out pages once
 *   `maxPages` distinct pages have been dequeued (visited), bounding the total
 *   number of pages the scraper renders.
 * - **domain restriction** (Requirement 2.6): when `restrictToDomain` is true,
 *   links whose host differs from the start URL's host are dropped at enqueue
 *   time; when false, cross-domain links are allowed.
 *
 * De-duplication: URLs are normalized (fragment stripped) and tracked in a
 * "seen" set so the same page is never enqueued — and therefore never
 * visited — twice, regardless of how many pages link to it.
 *
 * Defaults for the three options come from `config.crawl`.
 *
 * See design.md "Website Scraper" / `frontier.ts`. Requirements: 2.3, 2.4, 2.6.
 */

import { config } from "../../config.js";

/** A single entry in the crawl frontier: a URL together with its crawl depth. */
export interface FrontierItem {
  /** The normalized absolute URL to visit. */
  url: string;
  /** Distance in links from the start URL (start URL is depth 0). */
  depth: number;
}

/** Tunables controlling how far and how wide the frontier will schedule. */
export interface FrontierOptions {
  /** Maximum crawl depth; links beyond this depth are not enqueued. */
  maxDepth: number;
  /** Maximum number of distinct pages the frontier will hand out. */
  maxPages: number;
  /** When true, only links on the start URL's host are enqueued. */
  restrictToDomain: boolean;
}

/**
 * Normalize a URL for comparison and de-duplication.
 *
 * The fragment (`#section`) is stripped because it points within the same page
 * and never changes what the scraper would fetch. The `URL` constructor already
 * lowercases the host and resolves `.`/`..` path segments, giving a stable
 * canonical form. Relative links are resolved against `base` when provided.
 *
 * @returns the normalized href, or `undefined` when the input cannot be parsed
 * as a URL (invalid links are dropped rather than crashing the crawl).
 */
function normalizeUrl(link: string, base?: string): string | undefined {
  try {
    const url = new URL(link, base);
    url.hash = "";
    return url.href;
  } catch {
    return undefined;
  }
}

/**
 * A breadth-first crawl frontier.
 *
 * Seed it with the start URL (enqueued at depth 0), pull pages off with
 * `next()`, and report links discovered on each page back with `enqueue`. The
 * frontier applies the depth cap, page cap, domain restriction, and
 * de-duplication so callers never visit a page twice, follow a link too deep,
 * cross an off-limit domain, or exceed the page budget.
 */
export class Frontier {
  private readonly startHost: string;
  private readonly options: FrontierOptions;

  /** FIFO queue of pages waiting to be visited (breadth-first order). */
  private readonly queue: FrontierItem[] = [];

  /**
   * Every normalized URL ever enqueued or visited. Used to de-duplicate so a
   * URL is only ever scheduled once (Requirement: no page visited twice).
   */
  private readonly seen = new Set<string>();

  /** Count of pages handed out by `next()` (i.e. visited). */
  private visited = 0;

  /**
   * @param startUrl The URL to begin crawling from; enqueued at depth 0.
   * @param options Crawl caps; each field defaults to the matching
   *   `config.crawl` value when omitted.
   * @throws {Error} when `startUrl` is not a valid absolute URL.
   */
  constructor(startUrl: string, options: Partial<FrontierOptions> = {}) {
    const normalized = normalizeUrl(startUrl);
    if (!normalized) {
      throw new Error(`Invalid start URL: ${startUrl}`);
    }

    this.startHost = new URL(normalized).host;
    this.options = {
      maxDepth: options.maxDepth ?? config.crawl.maxDepth,
      maxPages: options.maxPages ?? config.crawl.maxPages,
      restrictToDomain: options.restrictToDomain ?? config.crawl.restrictToDomain,
    };

    // Seed the frontier with the start URL at depth 0.
    this.seen.add(normalized);
    this.queue.push({ url: normalized, depth: 0 });
  }

  /** Number of distinct pages handed out (visited) so far. */
  get visitedCount(): number {
    return this.visited;
  }

  /** Number of pages currently waiting in the queue. */
  get pendingCount(): number {
    return this.queue.length;
  }

  /**
   * Dequeue the next page to visit in breadth-first order.
   *
   * Returns `undefined` once the page cap (`maxPages`) has been reached or the
   * queue is empty, signalling the crawl is complete. Each returned page counts
   * against the visited total.
   *
   * @returns the next `{ url, depth }` to visit, or `undefined` when done.
   */
  next(): FrontierItem | undefined {
    // Enforce the page cap: never hand out more than maxPages pages.
    if (this.visited >= this.options.maxPages) {
      return undefined;
    }
    const item = this.queue.shift();
    if (!item) {
      return undefined;
    }
    this.visited += 1;
    return item;
  }

  /**
   * Enqueue links discovered on a page for future crawling.
   *
   * Links are enqueued at `parentDepth + 1`. The whole batch is skipped when
   * that child depth would exceed `maxDepth` (Requirement 2.3). Each remaining
   * link is normalized, filtered by domain when `restrictToDomain` is enabled
   * (Requirement 2.6), and de-duplicated against every URL already seen so no
   * page is scheduled twice.
   *
   * @param links Raw hrefs discovered on the parent page (absolute or relative;
   *   relative links are resolved against the parent URL when provided).
   * @param parentDepth The depth of the page the links were found on.
   * @param parentUrl Optional base URL for resolving relative links.
   * @returns the items actually enqueued from this batch.
   */
  enqueue(
    links: Iterable<string>,
    parentDepth: number,
    parentUrl?: string,
  ): FrontierItem[] {
    const childDepth = parentDepth + 1;

    // Depth cap: do not enqueue (or follow) links beyond maxDepth.
    if (childDepth > this.options.maxDepth) {
      return [];
    }

    const base = parentUrl ? normalizeUrl(parentUrl) : undefined;
    const added: FrontierItem[] = [];

    for (const link of links) {
      const normalized = normalizeUrl(link, base);
      if (!normalized) {
        continue; // unparseable link — drop it.
      }

      // Domain restriction: drop off-host links unless cross-domain is allowed.
      if (
        this.options.restrictToDomain &&
        new URL(normalized).host !== this.startHost
      ) {
        continue;
      }

      // De-duplicate: never schedule a URL that has already been seen.
      if (this.seen.has(normalized)) {
        continue;
      }

      this.seen.add(normalized);
      const item: FrontierItem = { url: normalized, depth: childDepth };
      this.queue.push(item);
      added.push(item);
    }

    return added;
  }
}
