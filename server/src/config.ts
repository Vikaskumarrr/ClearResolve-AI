/**
 * Single source of truth for all tunables and environment-derived settings.
 *
 * Ported from the Next.js app's `app/lib/config.ts`. Nothing in the
 * ingestion, retrieval, or chat paths should read a magic literal directly —
 * everything funnels through `config` so values can never drift between where
 * they are enforced and where they are reported. In particular, the file-size
 * limit reported to users is derived from the same constant that enforces it
 * (see `maxFileSizeMessage`).
 *
 * NOTE: dotenv is loaded at process start (see `src/index.ts` and
 * `src/scripts/loadDB.ts`) BEFORE this module is first evaluated, so
 * `requireEnv` sees the populated environment.
 */

/**
 * Read a required environment variable, throwing a descriptive error when it
 * is missing so misconfiguration fails fast at startup rather than surfacing
 * as an obscure runtime error later.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  mongo: {
    uri: requireEnv("MONGODB_URI"),
    db: requireEnv("MONGODB_DB"),
    chunksCollection: process.env.MONGODB_COLLECTION ?? "chunks",
    jobsCollection: "jobs",
    usersCollection: "users",
    conversationsCollection: "conversations",
    messagesCollection: "messages",
    vectorIndexName: requireEnv("VECTOR_INDEX_NAME"),
  },
  embeddings: { model: "gemini-embedding-001", dimensions: 3072 },
  chat: { model: "gemini-flash-latest" },
  conversations: {
    /** Maximum length of a conversation title derived from the first message. */
    titleMaxLength: 60,
    /** How long a conversation is retained after its last update, in days. */
    retentionDays: Number(process.env.RETENTION_DAYS ?? 30),
    /** Interval between retention sweeps: 1 hour (in milliseconds). */
    retentionSweepIntervalMs: 60 * 60 * 1000,
  },
  chunking: { chunkSize: 1000, chunkOverlap: 200 },
  retrieval: { k: 4 },
  limits: { maxFileSizeBytes: 10 * 1024 * 1024 }, // single source of truth
  crawl: { maxDepth: 3, maxPages: 50, restrictToDomain: true },
  session: {
    /**
     * Secret used to sign the session id cookie. Sourced from the environment
     * (never hardcoded) so it stays out of the repo and can differ per
     * deployment. `requireEnv` fails fast at startup if it is missing.
     */
    secret: requireEnv("SESSION_SECRET"),
    /** Collection in which connect-mongo persists session documents. */
    collectionName: "sessions",
    /** Cookie name for the session id. */
    cookieName: "rag.sid",
    /** Session lifetime: 7 days (in milliseconds). */
    maxAgeMs: 7 * 24 * 60 * 60 * 1000,
    /**
     * Send the cookie only over HTTPS in production. In development the client
     * and server run over plain HTTP on localhost, so `secure` must be off
     * there or the browser drops the cookie.
     */
    secureCookie: process.env.NODE_ENV === "production",
  },
} as const;

/**
 * Build the user-facing "file too large" message from the enforced byte limit,
 * so the reported size always matches the limit that is actually applied.
 */
export function maxFileSizeMessage(): string {
  const mb = config.limits.maxFileSizeBytes / (1024 * 1024);
  return `File too large (max ${mb}MB)`;
}
