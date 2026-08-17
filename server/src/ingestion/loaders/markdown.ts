/**
 * Markdown document loader.
 *
 * Markdown is already human-readable plain text, so the loader reads the source
 * content as UTF-8 and produces a single document from it, tagged with
 * `metadata.source` (Requirement 1.2, 1.8). Downstream chunking and embedding
 * treat the Markdown syntax as ordinary text.
 */

import type { DocumentLoader, LoadedDoc, SourceInput } from "./types.js";
import { readSourceText } from "./source.js";

export const markdownLoader: DocumentLoader = {
  format: "markdown",
  async load(input: SourceInput): Promise<LoadedDoc[]> {
    const content = await readSourceText(input);
    return [
      {
        pageContent: content,
        metadata: { source: input.source, format: "markdown" },
      },
    ];
  },
};

export default markdownLoader;
