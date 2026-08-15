import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't bundle the PDF parsing libraries. pdf.js (via pdf-parse) fails to set
  // up its worker when bundled by the Next.js server compiler, so we load these
  // from node_modules at runtime instead. This fixes the
  // "Setting up fake worker failed" error in /api/upload.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
