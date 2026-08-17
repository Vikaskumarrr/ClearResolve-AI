/**
 * The shared ingestion pipeline — the single place `load -> chunk -> embed ->
 * store` happens. Both the CLI seed and the API/UI call `runIngestion`, so
 * ingestion behaves identically regardless of caller (Requirements 3.1, 3.2,
 * 3.3, 8.1).
 *
 * Each stage is wrapped so that any failure is re-thrown as a `StageError`
 * naming the stage that failed (load | chunk | embed | store) and preserving
 * the original error as its `cause`. A stage failure halts the pipeline for
 * that source (Requirement 3.7). The chunker uses the configured size/overlap
 * (Requirement 3.4), the embedder produces 3072-dim vectors from the shared
 * factory (Requirement 3.5), and the store persists each chunk with its
 * embedding and source metadata (Requirement 3.6).
 *
 * See design.md "Shared Ingestion Pipeline".
 */

import type { EmbeddingsInterface } from "@langchain/core/embeddings";

import { chunkDocuments } from "./chunker.js";
import {
  StageError,
  UnsupportedFormatError,
  type PipelineStage,
} from "./errors.js";
import { detectFormat, getLoader } from "./loaders/index.js";
import type {
  FileSourceInput,
  LoadedDoc,
  SupportedFormat,
} from "./loaders/types.js";
import { store } from "./store.js";
import { config } from "../config.js";
import { embedder } from "../embeddings.js";
import type { JobProgress } from "../jobs/types.js";

// Progress reported as the pipeline advances uses the canonical `JobProgress`
// shape defined by the jobs layer (task 7.1), so the runner's `onProgress`
// callback can consume it directly. Re-exported here for existing importers.
export type { JobProgress };

/** Ingestion input for a file source (uploaded bytes or a path on disk). */
export interface FilePayload {
  /**
   * Original filename, used both to detect the format and (when `format` is
   * omitted) as a human-readable identifier. Format detection falls back to
   * this when `format` is not provided.
   */
  filename: string;
  /** Raw file bytes, when the file is provided in memory (upload route). */
  data?: Buffer | Uint8Array;
  /** Filesystem path, when the file is provided on disk (CLI seed). */
  path?: string;
  /** Explicit format override; detected from `filename` when omitted. */
  format?: SupportedFormat;
}

/** Ingestion input for a website/url source (crawled by the scraper). */
export interface UrlPayload {
  /** The start URL to crawl / the single page URL to load. */
  startUrl: string;
  /** Maximum crawl depth (defaults come from `config.crawl`). */
  maxDepth?: number;
  /** Maximum number of pages to visit. */
  maxPages?: number;
  /** Restrict crawling to the start URL's domain. */
  restrictToDomain?: boolean;
}

/** The input `runIngestion` consumes. Discriminated by `kind`. */
export interface IngestInput {
  /** Owning tenant — tags every chunk and scopes dedup (Requirement 6.3). */
  tenantId: string;
  /** Stable identifier for the source, used for dedup (Requirement 7). */
  sourceId: string;
  /** Whether this ingestion is for an uploaded file or a website URL. */
  kind: "file" | "url";
  /** The source payload; shape depends on `kind`. */
  payload: FilePayload | UrlPayload;
  /** Optional progress callback invoked as stages complete. */
  onProgress?: (progress: JobProgress) => Promise<void>;
}

/** The result of a successful ingestion run. */
export interface IngestResult {
  /** Number of documents produced by the load stage. */
  documents: number;
  /** Number of chunks stored. */
  chunks: number;
}

/**
 * A function that turns a `UrlPayload` into loaded documents. By default the
 * pipeline drives the Playwright scraper directly (via a dynamic import, see
 * {@link loadUrl}), so `kind: "url"` ingestion works with no separate
 * registration step. Tests may inject a fake scraper through
 * {@link registerUrlScraper} to route the url path without launching a real
 * browser; when a scraper is registered it takes precedence over the default.
 */
export type UrlScraper = (
  tenantId: string,
  sourceId: string,
  payload: UrlPayload
) => Promise<LoadedDoc[]>;

let urlScraper: UrlScraper | undefined;

/**
 * Register the website scraper used for `kind: "url"` ingestion. Optional: when
 * left unregistered, {@link loadUrl} falls back to invoking the Playwright
 * scraper directly. Its primary use is dependency injection in tests, letting
 * them exercise the url path with a fake scraper (no real Chromium required).
 */
export function registerUrlScraper(scraper: UrlScraper): void {
  urlScraper = scraper;
}

/** Reset the registered url scraper back to the default. Intended for tests. */
export function resetUrlScraper(): void {
  urlScraper = undefined;
}

/** Load an uploaded/on-disk file into documents via the loader registry. */
async function loadFile(sourceId: string, payload: FilePayload): Promise<LoadedDoc[]> {
  const format = payload.format ?? detectFormat(payload.filename);
  if (!format) {
    // Rejected by name (Requirement 1.6): surface the offending extension.
    const ext = payload.filename.includes(".")
      ? payload.filename.slice(payload.filename.lastIndexOf(".") + 1)
      : payload.filename;
    throw new UnsupportedFormatError(ext);
  }

  const input: FileSourceInput = {
    kind: "file",
    // Use the stable sourceId as the source identifier so metadata.source and
    // the dedup key in `store` agree end to end.
    source: sourceId,
    data: payload.data,
    path: payload.path,
  };
  return getLoader(format).load(input);
}

/**
 * Load a website source into documents.
 *
 * By default this drives the Playwright scraper directly so `kind: "url"`
 * ingestion works with no separate registration step: the scraper is pulled in
 * via a dynamic import (keeping Playwright out of the module graph for
 * file-only ingestion and tests), the {@link UrlPayload} is mapped onto the
 * scraper's `ScrapeOptions` — using `config.crawl` defaults for any cap the
 * payload omits — and the scraped `docs` are returned so they flow into
 * chunk -> embed -> store exactly like file sources (Requirements 2.1, 3.1).
 *
 * Per-page scrape failures are recorded by the scraper (Requirement 2.8) and
 * are not fatal here: we surface a count via `console.warn` and continue with
 * whatever pages succeeded rather than throwing.
 *
 * When a scraper has been injected through {@link registerUrlScraper} it takes
 * precedence, letting tests exercise the url path without launching Chromium.
 */
async function loadUrl(
  tenantId: string,
  sourceId: string,
  payload: UrlPayload
): Promise<LoadedDoc[]> {
  // Prefer an injected scraper (test hook); otherwise drive the real scraper.
  if (urlScraper) {
    return urlScraper(tenantId, sourceId, payload);
  }

  // Dynamic import keeps Playwright (and its heavy browser deps) off the module
  // graph unless a url source is actually ingested.
  const { scrapeSite } = await import("./scraper/scraper.js");

  const result = await scrapeSite({
    startUrl: payload.startUrl,
    maxDepth: payload.maxDepth ?? config.crawl.maxDepth,
    maxPages: payload.maxPages ?? config.crawl.maxPages,
    restrictToDomain: payload.restrictToDomain ?? config.crawl.restrictToDomain,
  });

  if (result.failures.length > 0) {
    // Non-fatal per-page failures (Requirement 2.8): report but keep going with
    // the pages that were scraped successfully.
    console.warn(
      `[ingestion] url source ${sourceId}: ${result.failures.length} page(s) failed to scrape`
    );
  }

  return result.docs;
}

/**
 * Run the shared ingestion pipeline for one source: load -> chunk -> embed ->
 * store, in order. Any stage failure is re-thrown as a `StageError` naming the
 * failed stage and the pipeline halts for that source (Requirement 3.7).
 *
 * @param input The tenant, source identifier, kind, payload, and optional
 *   progress callback.
 * @returns The number of documents loaded and chunks stored.
 */
export async function runIngestion(input: IngestInput): Promise<IngestResult> {
  let currentStage: PipelineStage = "load";

  try {
    // STAGE: load — parse the raw source into plain-text documents.
    currentStage = "load";
    const docs =
      input.kind === "file"
        ? await loadFile(input.sourceId, input.payload as FilePayload)
        : await loadUrl(input.tenantId, input.sourceId, input.payload as UrlPayload);

    await input.onProgress?.({
      processedDocuments: docs.length,
      storedChunks: 0,
    });

    // STAGE: chunk — split documents using the configured size/overlap.
    currentStage = "chunk";
    const chunks = await chunkDocuments(docs);

    // STAGE: embed — construct the shared 3072-dim embedder. The actual
    // vectorization happens inside `store` (via the vector store insert), which
    // uses this embedder instance.
    currentStage = "embed";
    const embeddings: EmbeddingsInterface = embedder();

    // STAGE: store — dedup by (tenantId, sourceId) then insert chunks with
    // their embeddings and source metadata.
    currentStage = "store";
    await store(input.tenantId, input.sourceId, chunks, embeddings);

    await input.onProgress?.({
      processedDocuments: docs.length,
      storedChunks: chunks.length,
    });

    return { documents: docs.length, chunks: chunks.length };
  } catch (e) {
    // Preserve already-typed StageErrors; otherwise name the failed stage
    // (Requirement 3.7) while retaining the original error as `cause`.
    if (e instanceof StageError) {
      throw e;
    }
    throw new StageError(currentStage, e);
  }
}
