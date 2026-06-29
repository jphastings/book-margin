import { type Clipping, clippingId } from "@byjp/kindle-clippings";

/** A single Highlighted.app export: one book, its ISBN, and its highlights. */
export interface HighlightedExport {
  title: string;
  author?: string;
  /** The ISBN printed in the export header (ISBN-10 or 13), if present. */
  isbn?: string;
  clippings: Clipping[];
}

const FOOTER = /^\*\*Created with \[Highlighted\]/;

/**
 * Parse a Highlighted.app Markdown export into a {@link HighlightedExport}.
 *
 * The export is one book: an `# Highlights for …` title, an `### Author`, an
 * `ISBN:` line, then one highlight each — a `> ` first line (only the first line
 * is quoted) followed by plain continuation lines, then plain `p. <page>`,
 * `Note:` and `Tags:` lines. The quote is read as Markdown — single line breaks
 * collapse to spaces, blank lines become paragraph breaks. Highlights become
 * {@link Clipping}s with a stable id (book + text, since there's no precise
 * locator) and no timestamp; the ISBN rides on the export so the caller can
 * resolve the book for free.
 */
export function parseHighlightedExport(markdown: string): HighlightedExport {
  const lines = markdown.replace(/^﻿/, "").replace(/\r\n?/g, "\n").split("\n");

  let title = "";
  let author: string | undefined;
  let isbn: string | undefined;

  const clippings: Clipping[] = [];
  // Quote lines in order; an empty string marks a blank (paragraph break) line.
  let quote: string[] = [];
  let page: string | [string, string] | undefined;
  let note: string | undefined;
  let inBlock = false;

  const flush = () => {
    const text = joinMarkdown(quote);
    if (text) {
      clippings.push({
        id: clippingId({ title, ...(author ? { author } : {}), fallbackText: text }),
        kind: "highlight",
        title,
        ...(author ? { author } : {}),
        ...(page !== undefined ? { page } : {}),
        text,
        ...(note ? { note } : {}),
      });
    }
    quote = [];
    page = undefined;
    note = undefined;
    inBlock = false;
  };

  for (const raw of lines) {
    const line = raw.trim();
    const quoted = line.startsWith(">");
    const content = quoted ? line.replace(/^>\s?/, "").trim() : line;

    if (FOOTER.test(content)) {
      flush();
      break;
    }

    // Only the first line of each highlight is `>`-prefixed, so a `>` always
    // starts a new highlight; its continuation lines and metadata are plain.
    if (quoted) {
      flush();
      inBlock = true;
      quote.push(content);
      continue;
    }

    if (inBlock) {
      // `p. 146`, `p. 18-19`, `p. xi` — a number or roman-numeral page, optionally
      // a span. The `p.`/`p ` prefix and the restricted alphabet keep prose out.
      const pageLine = content.match(/^p(?:\.\s*|\s+)([\divxlcdm]+(?:-[\divxlcdm]+)?)\s*$/i);
      if (pageLine) {
        const spec = pageLine[1]!;
        const dash = spec.indexOf("-");
        page = dash === -1 ? spec : [spec.slice(0, dash), spec.slice(dash + 1)];
        continue;
      }
      const noteLine = content.match(/^Note:\s*(.+)$/i);
      if (noteLine) {
        note = noteLine[1]!.trim();
        continue;
      }
      if (/^Tags:/i.test(content)) continue;
      // A continuation line, or a blank line (which marks a paragraph break).
      quote.push(content);
      continue;
    }

    // Header region (before the first highlight).
    const heading = content.match(/^#\s+(.+)$/);
    if (heading && !title) {
      title = heading[1]!.replace(/^Highlights for\s+/i, "").trim();
      continue;
    }
    const byline = content.match(/^###\s+(.+)$/);
    if (byline && !author) {
      author = byline[1]!.trim();
      continue;
    }
    const isbnLine = content.match(/^ISBN:\s*(\S+)/i);
    if (isbnLine && !isbn) {
      isbn = isbnLine[1]!.trim();
    }
  }
  flush();

  return {
    title,
    ...(author ? { author } : {}),
    ...(isbn ? { isbn } : {}),
    clippings,
  };
}

/** Join quote lines as Markdown: blank lines split paragraphs, the rest join with spaces. */
function joinMarkdown(lines: string[]): string {
  const paragraphs: string[] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (line === "") {
      if (current.length > 0) paragraphs.push(current.join(" "));
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) paragraphs.push(current.join(" "));
  return paragraphs.join("\n");
}
