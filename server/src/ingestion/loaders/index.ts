/**
 * Loader registry: maps a detected format to its per-format `DocumentLoader`.
 *
 * The ingestion pipeline never constructs a loader directly. Instead it detects
 * a source's format and asks the registry for the matching loader via
 * `getLoader(format)`. Formats outside the supported set are rejected by name
 * with an `UnsupportedFormatError`, so an unknown extension or content-type
 * surfaces as a clear, structured 400 rather than an opaque failure deeper in
 * the pipeline (Requirement 1.6).
 *
 * A small `detectFormat` helper is also exported for callers (upload route,
 * CLI) that only have a filename or content-type and need to resolve it to a
 * `SupportedFormat` before looking up a loader.
 */

import { UnsupportedFormatError } from "../errors.js";

import type { DocumentLoader, SupportedFormat } from "./types.js";
import { pdfLoader } from "./pdf.js";
import { markdownLoader } from "./markdown.js";
import { textLoader } from "./text.js";
import { htmlLoader } from "./html.js";
import { jsonLoader } from "./json.js";

/**
 * The registry of every supported format's loader. Keyed by `SupportedFormat`
 * so the map is exhaustive: adding a new `SupportedFormat` to the union without
 * registering a loader here is a compile-time error.
 */
const LOADERS: Record<SupportedFormat, DocumentLoader> = {
  pdf: pdfLoader,
  markdown: markdownLoader,
  txt: textLoader,
  html: htmlLoader,
  json: jsonLoader,
};

/** The set of formats the registry knows how to load. */
export const SUPPORTED_FORMATS = Object.keys(LOADERS) as SupportedFormat[];

/** Narrow an arbitrary string to a `SupportedFormat`. */
export function isSupportedFormat(format: string): format is SupportedFormat {
  return Object.prototype.hasOwnProperty.call(LOADERS, format);
}

/**
 * Resolve a detected format to its loader.
 *
 * @throws {UnsupportedFormatError} when `format` is not one of the supported
 * formats; the error names the offending format (Requirement 1.6).
 */
export function getLoader(format: string): DocumentLoader {
  if (!isSupportedFormat(format)) {
    throw new UnsupportedFormatError(format);
  }
  return LOADERS[format];
}

/**
 * Map common filename extensions and aliases to a `SupportedFormat`.
 *
 * Both the canonical format name (e.g. `"markdown"`) and its usual file
 * extensions (`"md"`, `"markdown"`) resolve to the same format so callers can
 * pass whatever they have on hand.
 */
const EXTENSION_TO_FORMAT: Record<string, SupportedFormat> = {
  pdf: "pdf",
  md: "markdown",
  markdown: "markdown",
  mdx: "markdown",
  txt: "txt",
  text: "txt",
  html: "html",
  htm: "html",
  json: "json",
};

/**
 * Best-effort detection of a `SupportedFormat` from a filename or extension.
 *
 * Accepts a full filename (`report.pdf`), a bare extension (`pdf` or `.pdf`),
 * or a canonical format name (`markdown`). Returns `undefined` when the input
 * does not map to a supported format, leaving the decision to reject to the
 * caller (typically via `getLoader`).
 */
export function detectFormat(nameOrExt: string): SupportedFormat | undefined {
  const normalized = nameOrExt.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  // Take the substring after the last dot when present (filename → extension);
  // otherwise treat the whole value as an extension/format alias.
  const lastDot = normalized.lastIndexOf(".");
  const ext = lastDot >= 0 ? normalized.slice(lastDot + 1) : normalized;
  return EXTENSION_TO_FORMAT[ext];
}

export type { DocumentLoader, SupportedFormat } from "./types.js";
