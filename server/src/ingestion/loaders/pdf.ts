/**
 * PDF document loader.
 *
 * Wraps LangChain's `PDFLoader` (backed by `pdf-parse`) so PDF files flow
 * through the same `DocumentLoader` contract as every other format. Every
 * produced document is tagged with `metadata.source` = the original source
 * identifier (Requirement 1.1, 1.8).
 */

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

import type { DocumentLoader, LoadedDoc, SourceInput } from "./types.js";
import { readSourceBytes } from "./source.js";

/**
 * `PDFLoader` accepts either a filesystem path or a `Blob`. Resolve the given
 * source to whichever form it can consume: a path (CLI seed) is passed
 * straight through, while in-memory bytes and URL fetches are wrapped in a
 * `Blob`.
 */
async function toPdfInput(input: SourceInput): Promise<string | Blob> {
  if (input.kind === "file" && input.path && !input.data) {
    return input.path;
  }
  const bytes = await readSourceBytes(input);
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}

export const pdfLoader: DocumentLoader = {
  format: "pdf",
  async load(input: SourceInput): Promise<LoadedDoc[]> {
    const loader = new PDFLoader(await toPdfInput(input));
    const docs = await loader.load();
    return docs.map((doc) => ({
      pageContent: doc.pageContent,
      metadata: { ...doc.metadata, source: input.source },
    }));
  },
};

export default pdfLoader;
