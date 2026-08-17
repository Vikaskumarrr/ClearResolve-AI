import { defineConfig } from "vitest/config";

/**
 * Vitest configuration for the server package.
 *
 * The source uses NodeNext ESM with explicit `.js` import extensions (e.g.
 * `import { config } from "../config.js"`). Vite's default resolver does not
 * rewrite those `.js` specifiers to the corresponding `.ts` source files, so a
 * small pre-resolve plugin maps relative `*.js` imports onto their `*.ts`
 * counterparts when running under Vitest.
 *
 * `config.ts` calls `requireEnv()` at module-evaluation time, so dummy values
 * for the required environment variables are injected via `test.env` to let the
 * pure chunking logic be exercised without a real MongoDB / index configured.
 */
export default defineConfig({
  plugins: [
    {
      name: "resolve-ts-from-js-extension",
      enforce: "pre",
      async resolveId(source, importer) {
        if (
          importer &&
          source.endsWith(".js") &&
          (source.startsWith("./") || source.startsWith("../"))
        ) {
          const tsCandidate = `${source.slice(0, -3)}.ts`;
          const resolved = await this.resolve(tsCandidate, importer, {
            skipSelf: true,
          });
          if (resolved) return resolved;
        }
        return null;
      },
    },
  ],
  test: {
    include: ["src/**/*.{test,property.test}.ts"],
    // Global fast-check default (>= 100 runs) as a safety net for any property
    // test that does not specify its own `numRuns`.
    setupFiles: ["./vitest.setup.ts"],
    env: {
      MONGODB_URI: "mongodb://localhost:27017",
      MONGODB_DB: "test",
      VECTOR_INDEX_NAME: "test_index",
      SESSION_SECRET: "test-session-secret",
    },
  },
});
