import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { DocumentInterface } from "@langchain/core/documents";

import { config } from "./config.js";
import { getRelevantChunks } from "./retriever.js";

/**
 * A reference attached to a chat answer, identifying a source document that
 * contributed to the retrieved context (Requirement 5.4).
 */
export interface Citation {
  /** Original source identifier (filename or page URL) of the document. */
  source: string;
  /** A short excerpt of that source's retrieved chunk text. */
  snippet: string;
}

/**
 * The result of a grounded chat turn: the model's answer plus one citation per
 * distinct source document used in the retrieved context.
 */
export interface ChatAnswer {
  answer: string;
  citations: Citation[];
}

/**
 * Response returned when retrieval finds no relevant chunks (Requirement 5.3).
 * Exported so tests (and the no-context example test) can assert against the
 * exact wording without duplicating the literal.
 */
export const NO_CONTEXT_ANSWER =
  "I don't know based on the provided documents.";

/** Maximum length of a citation snippet, in characters. */
const SNIPPET_MAX_LENGTH = 200;

/**
 * Build the grounded generation prompt. The model is instructed to answer
 * using ONLY the supplied context so the response stays grounded in the
 * tenant's own documents (Requirement 5.2). Kept identical in spirit to the
 * original chat route prompt.
 */
export function buildPrompt(context: string, message: string): string {
  return `Answer the question using ONLY the context below.
If the answer is not in the context, say "${NO_CONTEXT_ANSWER}"

Context:
${context}

Question: ${message}

Answer:`;
}

/**
 * Construct the chat model. `gemini-flash-latest` is sourced from `config` so
 * the model name is never hardcoded at the call site (Requirement 5.2).
 */
export function chatModel(): ChatGoogleGenerativeAI {
  return new ChatGoogleGenerativeAI({
    model: config.chat.model,
    apiKey: process.env.GOOGLE_API_KEY,
  });
}

/**
 * Normalize a chunk's `metadata.source` into a stable string identifier. Falls
 * back to `"unknown"` when a chunk carries no source (should not happen for
 * ingested chunks, which are always tagged, but keeps citations robust).
 */
function sourceOf(chunk: DocumentInterface): string {
  const source = chunk.metadata?.source;
  return typeof source === "string" && source.length > 0 ? source : "unknown";
}

/**
 * Build one Citation per DISTINCT source among the retrieved chunks
 * (Requirement 5.4). Chunks are deduplicated by `metadata.source`, preserving
 * first-seen order, and each citation's snippet is a short excerpt of that
 * source's first retrieved chunk.
 */
export function toCitations(chunks: DocumentInterface[]): Citation[] {
  const seen = new Set<string>();
  const citations: Citation[] = [];

  for (const chunk of chunks) {
    const source = sourceOf(chunk);
    if (seen.has(source)) continue;
    seen.add(source);

    const text = chunk.pageContent.trim();
    const snippet =
      text.length > SNIPPET_MAX_LENGTH
        ? `${text.slice(0, SNIPPET_MAX_LENGTH)}…`
        : text;

    citations.push({ source, snippet });
  }

  return citations;
}

/**
 * Chat service (Requirement 5).
 *
 * Retrieve the chunks relevant to `message`, scoped to the caller's tenant
 * (Requirement 6.4). If retrieval finds nothing, return the "not available in
 * the provided documents" response WITHOUT invoking the model (Requirement
 * 5.3). Otherwise build a grounded prompt, generate an answer with
 * `gemini-flash-latest` (Requirement 5.2), and attach one citation per distinct
 * source used in the retrieved context (Requirement 5.4).
 *
 * @param tenantId - The requesting tenant; retrieval is isolated to this tenant.
 * @param message - The user's chat message.
 */
export async function answer(
  tenantId: string,
  message: string
): Promise<ChatAnswer> {
  const chunks = await getRelevantChunks(tenantId, message);

  // No-context short-circuit (Requirement 5.3): skip the model entirely.
  if (chunks.length === 0) {
    return { answer: NO_CONTEXT_ANSWER, citations: [] };
  }

  const context = chunks.map((c) => c.pageContent).join("\n\n---\n\n");
  const res = await chatModel().invoke(buildPrompt(context, message));

  // `content` may be a plain string or an array of content parts depending on
  // the response; normalize to a string.
  const answerText =
    typeof res.content === "string"
      ? res.content
      : JSON.stringify(res.content);

  return { answer: answerText, citations: toCitations(chunks) };
}
