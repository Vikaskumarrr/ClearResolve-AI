/**
 * Store — the "store" stage of the ingestion pipeline.
 *
 * Persists chunks together with their embeddings and metadata into MongoDB
 * Atlas Vector Search. Two correctness concerns are handled here:
 *
 *   1. Idempotent re-ingestion (Requirement 7.1): before inserting, all prior
 *      chunks for the same `(tenantId, source)` pair are deleted, so
 *      re-ingesting a source replaces its chunks rather than creating
 *      duplicates.
 *   2. Multi-tenant isolation (Requirements 6.3, 7.2): every chunk is tagged
 *      with the owning `tenantId` (and its `source`). Because the delete is
 *      scoped by `tenantId`, identical source identifiers across different
 *      tenants remain independent — one tenant's re-ingestion never touches
 *      another tenant's chunks.
 *
 * See design.md "Storage + Dedup" / `store.ts`.
 */

import {
  MongoDBAtlasVectorSearch,
  type MongoDBAtlasVectorSearchLibArgs,
} from "@langchain/mongodb";
import type { EmbeddingsInterface } from "@langchain/core/embeddings";

import { config } from "../config.js";
import { getChunksCollection } from "../db/mongo.js";
import type { LoadedDoc } from "./loaders/types.js";

/**
 * Store chunks for a source on behalf of a tenant, replacing any prior chunks
 * for the same `(tenantId, source)` so re-ingestion is idempotent.
 *
 * Each chunk is tagged with `tenantId` and `source` in its metadata before it
 * is embedded and inserted, which is what enforces tenant isolation and scopes
 * deduplication per tenant.
 *
 * @param tenantId Owning tenant; used both for dedup scoping and chunk tagging.
 * @param source Original source identifier (filename or page URL).
 * @param chunks The chunk documents produced by the chunker.
 * @param embeddings The shared embeddings instance used to vectorize chunks.
 */
export async function store(
  tenantId: string,
  source: string,
  chunks: LoadedDoc[],
  embeddings: EmbeddingsInterface
): Promise<void> {
  const collection = await getChunksCollection();

  // Idempotent replace-by-source within the tenant (Requirements 7.1, 7.2):
  // remove this source's prior chunks for this tenant before inserting fresh
  // ones. Scoping by `tenantId` keeps other tenants' identical-source chunks
  // untouched.
  await collection.deleteMany({ tenantId, source });

  // Tag every chunk with the owning tenant and its source (Requirements 6.3,
  // 3.6) while preserving any metadata the loaders/chunker already attached.
  const tagged: LoadedDoc[] = chunks.map((chunk) => ({
    ...chunk,
    metadata: { ...chunk.metadata, tenantId, source },
  }));

  await MongoDBAtlasVectorSearch.fromDocuments(tagged, embeddings, {
    // KNOWN ISSUE (see retriever.ts): the top-level `mongodb` driver and the
    // copy nested under `@langchain/mongodb` resolve to different `Collection`
    // type definitions. They are structurally identical at runtime, so we cast
    // through `unknown` to reconcile the two versions.
    collection:
      collection as unknown as MongoDBAtlasVectorSearchLibArgs["collection"],
    indexName: config.mongo.vectorIndexName,
    textKey: "text",
    embeddingKey: "embedding",
  });
}
