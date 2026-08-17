/**
 * Plain-text (TXT) document loader.
 *
 * Reads the source content as UTF-8 text and produces a single document whose
 * `pageContent` is that text, tagged with `metadata.source` (Requirement 1.3,
 * 1.8).
 */

import type { DocumentLoader, LoadedDoc, SourceInput } from "./types.js";
import { readSourceText } from "./source.js";

export const textLoader: DocumentLoader = {
  format: "txt",
  async load(input: SourceInput): Promise<LoadedDoc[]> {
    const content = await readSourceText(input);
    return [
      {
        pageContent: content,
        metadata: { source: input.source, format: "txt" },
      },
    ];
  },
};

export default textLoader;
