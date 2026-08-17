/**
 * Loader contracts shared by every per-format document loader.
 *
 * A loader turns one raw source (a file buffer/path or a URL) into a list of
 * plain-text `LoadedDoc` objects, all sharing the same `{ pageContent,
 * metadata }` shape so the rest of the pipeline (chunk -> embed -> store) never
 * needs to know which format it came from. A registry maps a detected
 * `SupportedFormat` to its `DocumentLoader`; unknown formats are rejected by
 * name (see `UnsupportedFormatError`). Every loader must attach
 * `metadata.source` = the original source identifier to each produced document.
 *
 * See design.md "Document Loaders". Requirements: 1.8.
 */

/** The document formats the ingestion service knows how to load. */
export type SupportedFormat = "pdf" | "markdown" | "txt" | "html" | "json";

/**
 * A single loaded text document. Mirrors the LangChain `Document` shape so
 * loaded docs flow directly into the chunker.
 *
 * `metadata` always includes a `source` key identifying where the content came
 * from (filename or page URL) — Requirement 1.8.
 */
export interface LoadedDoc {
  /** The extracted plain-text content of the document. */
  pageContent: string;
  /** Arbitrary metadata; always includes `source`. */
  metadata: Record<string, unknown> & { source: string };
}

/** Input that comes from a file (uploaded buffer or a path on disk). */
export interface FileSourceInput {
  kind: "file";
  /** Original source identifier (filename), attached as `metadata.source`. */
  source: string;
  /** Raw file bytes, when the file is provided in memory. */
  data?: Buffer | Uint8Array;
  /** Filesystem path, when the file is provided on disk (CLI seed). */
  path?: string;
}

/** Input that comes from a URL (a single page or scrape start URL). */
export interface UrlSourceInput {
  kind: "url";
  /** Original source identifier (page URL), attached as `metadata.source`. */
  source: string;
  /** The URL to load. */
  url: string;
}

/**
 * The input a loader consumes. Discriminated on `kind` so a loader can support
 * file-backed and URL-backed sources uniformly.
 */
export type SourceInput = FileSourceInput | UrlSourceInput;

/**
 * A per-format loader. Each implementation declares the `format` it handles and
 * parses a `SourceInput` into one or more `LoadedDoc`s, tagging every document
 * with `metadata.source`.
 */
export interface DocumentLoader {
  /** The format this loader handles. */
  format: SupportedFormat;
  /** Parse the input source into plain-text documents. */
  load(input: SourceInput): Promise<LoadedDoc[]>;
}
