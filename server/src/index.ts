import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";

// Load env BEFORE importing anything that reads config (config.ts calls
// requireEnv at module-evaluation time). We reuse the shared `.env` at the
// repo root (one level up from `server/`).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Dynamic import so config/app modules evaluate only after env is loaded.
const { buildApp } = await import("./app.js");

const app = buildApp();
const port = Number(process.env.PORT ?? 4000);

app.listen(port, () => {
  console.log(`RAG API server listening on http://localhost:${port}`);
});
