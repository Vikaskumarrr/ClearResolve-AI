import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

import { config } from "./config.js";

/**
 * Shared embeddings factory.
 *
 * Ported from the Next.js app's `app/lib/embeddings.ts`. This is the single
 * place the whole system constructs an embedder, so the query path and the
 * ingestion path always embed with the same model and dimensionality — the
 * core correctness rule of RAG. Model and dimensionality come from
 * `config.embeddings` (single source of truth), not hardcoded literals.
 */
export function embedder(): GoogleGenerativeAIEmbeddings {
  return new GoogleGenerativeAIEmbeddings({
    model: config.embeddings.model,
    apiKey: process.env.GOOGLE_API_KEY,
  });
}
