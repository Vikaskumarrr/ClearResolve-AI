import {
  MongoDBAtlasVectorSearch,
  type MongoDBAtlasVectorSearchLibArgs,
} from "@langchain/mongodb";

import { config } from "./config.js";
import { embedder } from "./embeddings.js";
import { getChunksCollection } from "./db/mongo.js";

/**
 * Retrieve the chunks most relevant to a question via Atlas Vector Search,
 * scoped to a single tenant.
 *
 * Ported from the Next.js app's `app/lib/retriever.ts`, but refactored to use
 * the shared `config`, `embedder()` factory, and the shared Mongo client
 * rather than constructing its own connection and embedder inline. The query
 * is embedded with the SAME `embedder()` factory (and therefore the same model
 * and dimensionality) used by the ingestion path — the core correctness rule
 * of RAG, without which the vector distances would be meaningless.
 *
 * Tenant isolation (Requirement 6.4): a `preFilter` on `tenantId` restricts the
 * similarity search to chunks owned by the requesting tenant, so results can
 * never cross the tenant boundary. The filter is applied *inside* the Atlas
 * vector search, which requires the Atlas index to declare `tenantId` as a
 * `filter` field (see task 9.2 / the index definition in the design doc). If
 * that filter field is not present in the index, the pre-filter is silently
 * ineffective — the index definition and this pre-filter are two halves of the
 * same isolation mechanism.
 *
 * By default `k` is `config.retrieval.k`, so callers get the configured number
 * of relevant chunks (Requirement 5.1) without repeating the literal.
 *
 * @param tenantId - The owning tenant; only this tenant's chunks are searched.
 * @param question - The user's question; embedded with `embedder()`.
 * @param k - Number of chunks to return; defaults to `config.retrieval.k`.
 */
export async function getRelevantChunks(
  tenantId: string,
  question: string,
  k: number = config.retrieval.k
) {
  const collection = await getChunksCollection();

  const store = new MongoDBAtlasVectorSearch(embedder(), {
    // KNOWN ISSUE: the top-level `mongodb` driver and the copy nested under
    // `@langchain/mongodb` resolve to different `Collection` type definitions
    // (differing `MongoOptions` shapes). They are structurally identical at
    // runtime, so we cast through `unknown` to reconcile the two versions.
    collection:
      collection as unknown as MongoDBAtlasVectorSearchLibArgs["collection"],
    indexName: config.mongo.vectorIndexName,
    textKey: "text",
    embeddingKey: "embedding",
  });

  return store.similaritySearch(question, k, {
    preFilter: { tenantId: { $eq: tenantId } },
  });
}
