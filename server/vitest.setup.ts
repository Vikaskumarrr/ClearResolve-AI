import fc from "fast-check";

/**
 * Global test setup for the server package.
 *
 * Property tests are required to explore at least 100 inputs (design tasks
 * 3.4 / 6.4 / 7.1). Individual tests may still pass an explicit `numRuns`
 * (most use 200); this global default is an additive safety net so that any
 * property test which omits `numRuns` still runs >= 100 iterations.
 *
 * All external services (MongoDB, Gemini embeddings/chat, Playwright/Chromium)
 * are mocked per-test via `vi.mock`, so the suite never reaches out to real
 * infrastructure.
 */
fc.configureGlobal({ numRuns: 100 });
