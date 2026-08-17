/**
 * Chunker — the "chunk" stage of the ingestion pipeline.
 *
 * Wraps LangChain's `RecursiveCharacterTextSplitter`, configured from
 * `config.chunking` (chunk size 1000, overlap 200), so every caller splits
 * loaded documents the same way. Splitting into overlapping windows keeps each
 * embedded passage focused while the overlap preserves context that would
 * otherwise be lost across a boundary.
 *
 * Metadata — including the `source` identifier attached by the loaders
 * (Requirement 1.8) — is carried through onto every produced chunk.
 *
 * See design.md "Shared Ingestion Pipeline" / `chunker.ts`. Requirements: 3.4.
 */

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import { config } from "../config.js";
import type { LoadedDoc } from "./loaders/types.js";

/**
 * The document shape `RecursiveCharacterTextSplitter.splitDocuments` accepts and
 * returns, derived from the method signature so we don't depend on importing
 * `@langchain/core` directly (it is only a transitive dependency here).
 */
type SplitterDoc = Awaited<
  ReturnType<RecursiveCharacterTextSplitter["splitDocuments"]>
>[number];

/**
 * Build a `RecursiveCharacterTextSplitter` configured from `config.chunking`.
 *
 * Exposed so callers/tests can obtain a splitter that always reflects the
 * single source of truth for chunk size and overlap.
 */
export function createSplitter(): RecursiveCharacterTextSplitter {
  return new RecursiveCharacterTextSplitter({
    chunkSize: config.chunking.chunkSize,
    chunkOverlap: config.chunking.chunkOverlap,
  });
}

/**
 * Split loaded documents into overlapping chunk documents using the configured
 * chunk size and overlap (Requirement 3.4).
 *
 * Each produced chunk preserves its parent document's metadata, so the
 * `source` identifier (and any other loader metadata) flows through to storage.
 *
 * @param docs Documents produced by a loader or the website scraper.
 * @returns The chunked documents, in order, with metadata preserved.
 */
export async function chunkDocuments(docs: LoadedDoc[]): Promise<LoadedDoc[]> {
  const splitter = createSplitter();

  // LoadedDoc is structurally the LangChain `Document` shape ({ pageContent,
  // metadata }), so it flows straight into splitDocuments, which preserves
  // each parent's metadata on the chunks it emits.
  const input = docs as unknown as SplitterDoc[];
  const chunks = await splitter.splitDocuments(input);

  return chunks.map((chunk) => ({
    pageContent: chunk.pageContent,
    metadata: chunk.metadata as LoadedDoc["metadata"],
  }));
}
