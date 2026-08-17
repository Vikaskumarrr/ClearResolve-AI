/**
 * JSON document loader.
 *
 * Parses the source as JSON, then recursively walks the resulting value and
 * concatenates every string field value it finds (in document order). Object
 * keys and non-string primitives (numbers, booleans, null) are ignored so the
 * extracted text reflects the human-readable content rather than structural
 * scaffolding. The result is a single document tagged with `metadata.source`
 * (Requirement 1.5, 1.8).
 */

import type { DocumentLoader, LoadedDoc, SourceInput } from "./types.js";
import { readSourceText } from "./source.js";

/**
 * Recursively collect every string value contained in a parsed JSON value.
 * Arrays and objects are traversed depth-first; strings are collected, and all
 * other primitives are skipped.
 */
export function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    out.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) {
      collectStrings(item, out);
    }
  } else if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value)) {
      collectStrings((value as Record<string, unknown>)[key], out);
    }
  }
  return out;
}

export const jsonLoader: DocumentLoader = {
  format: "json",
  async load(input: SourceInput): Promise<LoadedDoc[]> {
    const raw = await readSourceText(input);
    const parsed = JSON.parse(raw);
    const strings = collectStrings(parsed);
    return [
      {
        pageContent: strings.join("\n"),
        metadata: { source: input.source, format: "json" },
      },
    ];
  },
};

export default jsonLoader;
