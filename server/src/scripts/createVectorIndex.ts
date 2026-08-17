/**
 * CLI script — create/apply the Atlas Vector Search index for the chunks
 * collection (Requirements 6.4, 7.2).
 *
 * The index definition is version-controlled in `server/atlas/vector-index.json`
 * (vector field `embedding` at 3072-dim/cosine, plus `tenantId` and `source`
 * filter fields). This script reads that JSON and applies it via the driver's
 * `createSearchIndex`, overriding the index name with `config.mongo.vectorIndexName`
 * so it always matches the running configuration (VECTOR_INDEX_NAME).
 *
 * REQUIREMENTS: the target `MONGODB_URI` must be an Atlas cluster that supports
 * Vector Search (M10+ or serverless/Flex). It does not work against a local
 * `mongod` or a tier without Atlas Search. See `server/atlas/README.md`.
 *
 * Usage (from server/):
 *   npm run atlas:create-index
 */

import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";

// Load the shared `.env` at the repo root BEFORE importing config-reading
// modules (config.ts calls requireEnv at module-evaluation time). This file
// lives at server/src/scripts/, so the repo root is three levels up.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
dotenv.config({ path: path.resolve(repoRoot, ".env") });

interface VectorIndexFile {
  name?: string;
  type?: string;
  definition: Record<string, unknown>;
}

async function main(): Promise<void> {
  // The JSON definition lives under server/atlas/. From server/src/scripts/
  // that is two levels up, then into atlas/.
  const indexFilePath = path.resolve(
    __dirname,
    "../../atlas/vector-index.json"
  );
  const raw = await readFile(indexFilePath, "utf8");
  const indexFile = JSON.parse(raw) as VectorIndexFile;

  // Import config + db AFTER dotenv has populated the environment, since
  // config.ts reads required env vars at module-evaluation time.
  const { config } = await import("../config.js");
  const { getChunksCollection, getMongoClient } = await import("../db/mongo.js");

  // The index name must match what retrieval/store use (config-driven), so we
  // override whatever placeholder the JSON carries.
  const name = config.mongo.vectorIndexName;
  const collection = await getChunksCollection();

  console.log(
    `Creating Atlas Vector Search index "${name}" on collection "${config.mongo.chunksCollection}" in db "${config.mongo.db}"...`
  );

  try {
    const created = await collection.createSearchIndex({
      name,
      type: indexFile.type ?? "vectorSearch",
      definition: indexFile.definition,
    });
    console.log(
      `Requested index "${created}". Atlas builds it asynchronously; wait for it to become Active before querying.`
    );
  } finally {
    const client = await getMongoClient();
    await client.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
