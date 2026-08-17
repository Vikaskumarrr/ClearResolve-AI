/**
 * Playwright website scraper — the rendering + extraction core of the crawler.
 *
 * `scrapeSite` performs a breadth-first crawl from a start URL using a real
 * Chromium browser (via Playwright) so JavaScript-rendered pages produce their
 * true DOM text before extraction (Requirement 2.2). Scheduling, the three
 * crawl caps (depth, page-count, domain restriction), and de-duplication are
 * delegated to the {@link Frontier}; robots.txt access rules are consulted via
 * a {@link RobotsChecker} before any page is visited (Requirement 2.5). Each
 * successfully rendered page becomes a `LoadedDoc` tagged with
 * `metadata.source = pageUrl` (Requirements 2.1, 2.7), and any per-page load or
 * render error is recorded in `failures` without aborting the crawl
 * (Requirement 2.8).
 *
 * ## Testability
 *
 * Launching a real browser is expensive and impossible in environments without
 * Chromium binaries installed. The scraper therefore isolates every side effect
 * behind two injectable dependencies:
 *
 * - `launchBrowser` — returns a {@link BrowserSession} that knows how to fetch a
 *   single page's readable text and links. The default launches headless
 *   Chromium via Playwright (dynamically imported so the module only loads in a
 *   runtime that actually has it). Unit tests inject a fake session that returns
 *   canned HTML/links for a tiny link graph — no real browser required.
 * - `robots` — a {@link RobotsChecker}; defaults to a live checker but can be
 *   stubbed offline.
 *
 * ## Runtime requirement (flagged)
 *
 * Playwright needs a long-lived Node process with browser binaries installed
 * (`npx playwright install chromium`). It does NOT run inside standard
 * serverless/edge functions. The scraper is intended to run in the dedicated
 * background worker runtime (see design.md "Background execution
 * infrastructure").
 *
 * See design.md "Website Scraper". Requirements: 2.1, 2.2, 2.7, 2.8.
 */

import { config } from "../../config.js";
import type { LoadedDoc } from "../loaders/types.js";

import { Frontier } from "./frontier.js";
import { createRobotsChecker, type RobotsChecker } from "./robots.js";

/** Options controlling a single {@link scrapeSite} crawl. */
export interface ScrapeOptions {
  /** The URL to begin crawling from (crawled at depth 0). */
  startUrl: string;
  /** Maximum crawl depth; links beyond this depth are not followed (Req 2.3). */
  maxDepth: number;
  /** Maximum number of pages to visit; crawling stops once reached (Req 2.4). */
  maxPages: number;
  /** When true, only pages on the start URL's host are crawled (Req 2.6). */
  restrictToDomain: boolean;
}

/** The outcome of a crawl: rendered pages plus a record of per-page failures. */
export interface ScrapeResult {
  /** One document per successfully scraped page (Req 2.1, 2.7). */
  docs: LoadedDoc[];
  /** Pages that failed to load or render, recorded but not fatal (Req 2.8). */
  failures: { url: string; error: string }[];
}

/** The rendered content extracted from a single page. */
export interface RenderedPage {
  /** The page's readable text (rendered DOM `innerText`). */
  text: string;
  /** Absolute hrefs of the links discovered on the page. */
  links: string[];
}

/**
 * A live browser session capable of rendering pages and extracting their text
 * and links. The default is backed by Playwright/Chromium, but any object
 * satisfying this shape can be injected for testing.
 */
export interface BrowserSession {
  /**
   * Navigate to `url`, wait for the page to render, and return its readable
   * text and discovered links. Rejects if navigation or rendering fails so the
   * caller can record the failure and continue (Req 2.8).
   */
  fetchPage(url: string): Promise<RenderedPage>;
  /** Release all browser resources. Always called in a `finally`. */
  close(): Promise<void>;
}

/** Factory that opens a fresh {@link BrowserSession}. */
export type BrowserLauncher = () => Promise<BrowserSession>;

/** Injectable dependencies for {@link scrapeSite}. */
export interface ScrapeDeps {
  /**
   * Opens the browser session used to render pages. Defaults to a headless
   * Chromium session via Playwright ({@link launchPlaywrightBrowser}).
   */
  launchBrowser?: BrowserLauncher;
  /**
   * robots.txt checker consulted before visiting each URL. Defaults to a live
   * {@link createRobotsChecker}.
   */
  robots?: RobotsChecker;
  /**
   * User-agent token passed to the robots checker when deciding whether a URL
   * may be crawled. Defaults to the checker's own default.
   */
  userAgent?: string;
}

/**
 * Crawl a website starting at `opts.startUrl`, rendering each page with a real
 * browser and extracting its readable text into `LoadedDoc`s.
 *
 * The crawl is breadth-first and bounded by the {@link Frontier} (depth,
 * page-count, domain restriction, de-dup). Before each page is visited its URL
 * is checked against robots.txt; disallowed URLs are skipped silently and the
 * crawl continues (Req 2.5). A page that throws while loading/rendering is
 * recorded in `failures` and does not abort the crawl (Req 2.8). The browser
 * session is always closed, even on error.
 *
 * @param opts Start URL and crawl caps.
 * @param deps Optional injected browser launcher and robots checker (used by
 *   tests to run without a real Chromium install).
 * @returns The scraped documents and any per-page failures.
 */
export async function scrapeSite(
  opts: ScrapeOptions,
  deps: ScrapeDeps = {},
): Promise<ScrapeResult> {
  const robots = deps.robots ?? createRobotsChecker();
  const launchBrowser = deps.launchBrowser ?? launchPlaywrightBrowser;

  const frontier = new Frontier(opts.startUrl, {
    maxDepth: opts.maxDepth,
    maxPages: opts.maxPages,
    restrictToDomain: opts.restrictToDomain,
  });

  const docs: LoadedDoc[] = [];
  const failures: { url: string; error: string }[] = [];

  const session = await launchBrowser();
  try {
    for (let item = frontier.next(); item; item = frontier.next()) {
      const { url, depth } = item;

      // Respect robots.txt: skip disallowed URLs but keep crawling (Req 2.5).
      let allowed: boolean;
      try {
        allowed = await robots.isAllowed(url, deps.userAgent);
      } catch (err) {
        // A robots-check failure should not sink the whole page; record it and
        // move on so one flaky robots lookup cannot abort the crawl (Req 2.8).
        failures.push({ url, error: describeError(err) });
        continue;
      }
      if (!allowed) {
        continue;
      }

      try {
        const rendered = await session.fetchPage(url);
        docs.push({
          pageContent: rendered.text,
          // Source is the page URL so downstream dedup + citations key on it
          // (Requirements 2.1, 2.7).
          metadata: { source: url, pageUrl: url, format: "html" },
        });
        // Feed discovered links back into the frontier; caps/domain/de-dup are
        // enforced there.
        frontier.enqueue(rendered.links, depth, url);
      } catch (err) {
        // Per-page resilience: record and continue (Req 2.8).
        failures.push({ url, error: describeError(err) });
      }
    }
  } finally {
    await session.close();
  }

  return { docs, failures };
}

/** Normalize an unknown thrown value into a human-readable message. */
function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Default {@link BrowserLauncher}: a headless Chromium session via Playwright.
 *
 * Playwright is imported dynamically so this module can be loaded (and its
 * pure logic unit-tested) in environments where the `playwright` package or its
 * browser binaries are not installed. Callers that actually crawl must run in a
 * runtime where `npx playwright install chromium` has been executed.
 *
 * Each page is rendered in its own tab: navigate, wait for network idle so
 * client-rendered content settles (Req 2.2), then extract `document.body`'s
 * `innerText` and every `a[href]` as an absolute URL.
 */
export async function launchPlaywrightBrowser(): Promise<BrowserSession> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  return {
    async fetchPage(url: string): Promise<RenderedPage> {
      const page = await context.newPage();
      try {
        await page.goto(url, { waitUntil: "networkidle" });
        // These callbacks execute inside the page's browser context, where the
        // DOM globals exist. The server tsconfig deliberately omits the DOM lib
        // (this is Node code), so we reach the globals through `globalThis` and
        // keep the browser-side types local to avoid widening the project lib.
        const text = await page.evaluate(() => {
          const doc = (globalThis as { document?: { body?: { innerText?: string } } }).document;
          return doc?.body?.innerText ?? "";
        });
        const links = await page.evaluate(() => {
          const doc = (globalThis as {
            document?: { querySelectorAll(sel: string): Iterable<{ href: string }> };
          }).document;
          if (!doc) return [] as string[];
          return Array.from(doc.querySelectorAll("a[href]")).map((a) => a.href);
        });
        return { text, links };
      } finally {
        await page.close();
      }
    },
    async close(): Promise<void> {
      await browser.close();
    },
  };
}

export default scrapeSite;

/** Re-exported default crawl caps for callers that want config-driven runs. */
export const defaultScrapeOptions = {
  maxDepth: config.crawl.maxDepth,
  maxPages: config.crawl.maxPages,
  restrictToDomain: config.crawl.restrictToDomain,
} as const;
