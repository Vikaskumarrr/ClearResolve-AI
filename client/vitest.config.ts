import { defineConfig } from "vitest/config";

/**
 * Vitest configuration for the client package.
 *
 * The colocated property/unit tests under `src/**` exercise pure helpers (e.g.
 * `chatSearch.ts`) without mounting the React tree, so a plain `node`
 * environment is sufficient. A setup file installs a global fast-check default
 * of >= 100 runs, mirroring the server package convention.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.{test,property.test}.{ts,tsx}"],
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
  },
});
