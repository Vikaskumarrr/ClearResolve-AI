/**
 * CLI seed script — a thin wrapper over the shared ingestion pipeline.
 *
 * This script no longer contains any load/chunk/embed/store logic of its own.
 * It parses a source file path and tenant id from the command line, then hands
 * off to `runIngestion` — the single implementation shared with the API/upload
 * path (Requirements 3.2, 8.1). Source paths come from CLI arguments rather
 * than hardcoded literals (Requirement 8.2).
 *
 * Usage:
 *   npm run seed -- <sourcePath> [tenantId]
 *   npm run seed -- --source <sourcePath> --tenant <tenantId>
 *
 * Examples:
 *   npm run seed -- ./data/sample.pdf
 *   npm run seed -- ./data/handbook.md acme
 */

import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";

// Load the shared `.env` at the repo root BEFORE importing config-reading
// modules (config.ts calls requireEnv at module-evaluation time). This file
// lives at server/src/scripts/, so the repo root is three levels up.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
dotenv.config({ path: path.resolve(repoRoot, ".env") });

/** Default tenant used when the caller does not supply one. */
const DEFAULT_TENANT = "default";

interface CliArgs {
  sourcePath: string;
  tenantId: string;
}

/**
 * Parse the source path and tenant id from `argv`. Supports both positional
 * (`<sourcePath> [tenantId]`) and flag (`--source`/`-s`, `--tenant`/`-t`)
 * forms. Returns `undefined` when no source path is provided so the caller can
 * print usage and exit.
 */
function parseArgs(argv: string[]): CliArgs | undefined {
  let sourcePath: string | undefined;
  let tenantId: string | undefined;
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--source":
      case "-s":
        sourcePath = argv[++i];
        break;
      case "--tenant":
      case "-t":
        tenantId = argv[++i];
        break;
      default:
        positional.push(arg);
        break;
    }
  }

  // Fall back to positional args: <sourcePath> [tenantId].
  sourcePath ??= positional[0];
  tenantId ??= positional[1];

  if (!sourcePath) {
    return undefined;
  }

  return { sourcePath, tenantId: tenantId ?? DEFAULT_TENANT };
}

function printUsage(): void {
  console.error(
    [
      "Seed the vector store from a document file via the shared ingestion pipeline.",
      "",
      "Usage:",
      "  npm run seed -- <sourcePath> [tenantId]",
      "  npm run seed -- --source <sourcePath> --tenant <tenantId>",
      "",
      "Examples:",
      "  npm run seed -- ./data/sample.pdf",
      "  npm run seed -- ./data/handbook.md acme",
      "",
      `If tenantId is omitted, it defaults to "${DEFAULT_TENANT}".`,
    ].join("\n")
  );
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args) {
    printUsage();
    process.exit(1);
  }

  // Resolve the source path against the current working directory so relative
  // paths (e.g. ./data/sample.pdf) behave intuitively when run from the repo.
  const absoluteSource = path.resolve(process.cwd(), args.sourcePath);
  const filename = path.basename(absoluteSource);

  // Import pipeline + db AFTER dotenv has populated the environment, since
  // config.ts reads required env vars at module-evaluation time.
  const { runIngestion } = await import("../ingestion/pipeline.js");
  const { getMongoClient } = await import("../db/mongo.js");

  console.log(
    `Ingesting "${filename}" (path: ${absoluteSource}) for tenant "${args.tenantId}"...`
  );

  try {
    const result = await runIngestion({
      tenantId: args.tenantId,
      // Use the filename as the stable source identifier so re-seeding the same
      // file replaces its chunks (dedup) rather than duplicating them.
      sourceId: filename,
      kind: "file",
      payload: { filename, path: absoluteSource },
    });

    console.log(
      `Done: stored ${result.chunks} chunk(s) from ${result.documents} document(s).`
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
