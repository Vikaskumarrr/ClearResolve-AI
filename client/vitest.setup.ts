import fc from "fast-check";

/**
 * Global test setup for the client package.
 *
 * Property tests are required to explore at least 100 inputs. Individual tests
 * may still pass an explicit `numRuns`; this global default is an additive
 * safety net so any property test that omits `numRuns` still runs >= 100
 * iterations.
 */
fc.configureGlobal({ numRuns: 100 });
