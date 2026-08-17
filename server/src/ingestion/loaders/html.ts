/**
 * HTML document loader.
 *
 * Extracts readable text from an HTML source by removing non-content elements
 * (`<script>`, `<style>`, comments), stripping the remaining tags, decoding a
 * handful of common HTML entities, and collapsing whitespace. The result is a
 * single document tagged with `metadata.source` (Requirement 1.4, 1.8).
 */

import type { DocumentLoader, LoadedDoc, SourceInput } from "./types.js";
import { readSourceText } from "./source.js";

/** Decode the most common named/numeric HTML entities to plain characters. */
function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(parseInt(code, 16)),
    );
}

/**
 * Convert raw HTML into readable plain text.
 *
 * Scripts, styles, and comments carry no reader-visible content, so they are
 * removed wholesale before tags are stripped. Block-level boundaries are turned
 * into spaces so words do not run together, and runs of whitespace are
 * collapsed.
 */
export function htmlToText(html: string): string {
  const withoutScripts = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  const withoutTags = withoutScripts.replace(/<[^>]+>/g, " ");

  return decodeEntities(withoutTags).replace(/\s+/g, " ").trim();
}

export const htmlLoader: DocumentLoader = {
  format: "html",
  async load(input: SourceInput): Promise<LoadedDoc[]> {
    const raw = await readSourceText(input);
    return [
      {
        pageContent: htmlToText(raw),
        metadata: { source: input.source, format: "html" },
      },
    ];
  },
};

export default htmlLoader;
