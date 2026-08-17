/**
 * Small shared helpers for reading a `SourceInput` into raw bytes or text.
 *
 * The per-format loaders (markdown, text, html, json, pdf) all need to get at
 * the underlying content of a source, whether it arrived as an in-memory
 * buffer (`FileSourceInput.data`), a path on disk (`FileSourceInput.path`, used
 * by the CLI seed), or a URL (`UrlSourceInput.url`). These helpers centralize
 * that resolution so each loader stays focused on parsing, not I/O.
 */

import { readFile } from "node:fs/promises";

import type { SourceInput } from "./types.js";

/**
 * Read the raw bytes of a source regardless of how it was provided.
 *
 * - `file` input with `data` -> use the in-memory bytes directly.
 * - `file` input with `path` -> read the file from disk.
 * - `url` input -> fetch the URL and read its body.
 */
export async function readSourceBytes(input: SourceInput): Promise<Buffer> {
  if (input.kind === "file") {
    if (input.data) {
      return Buffer.from(input.data);
    }
    if (input.path) {
      return readFile(input.path);
    }
    throw new Error(
      `File source "${input.source}" provided neither in-memory data nor a path`,
    );
  }

  // kind === "url"
  const res = await fetch(input.url);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch "${input.url}": ${res.status} ${res.statusText}`,
    );
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/** Read the source content decoded as UTF-8 text. */
export async function readSourceText(input: SourceInput): Promise<string> {
  const bytes = await readSourceBytes(input);
  return bytes.toString("utf-8");
}
