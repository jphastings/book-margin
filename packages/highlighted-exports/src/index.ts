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
 * `ISBN:` line, then highlight blocks — a `>` quote, a `p. <page>` line, and
 * optional `Note:`/`Tags:` lines. Highlights become {@link Clipping}s with a
 * stable id (book + text, since there's no precise locator) and no timestamp;
 * the ISBN rides on the export so the caller can resolve the book for free.
 */
export function parseHighlightedExport(markdown: string): HighlightedExport {
  const lines = markdown.replace(/^﻿/, "").replace(/\r\n?/g, "\n").split("\n");

  let title = "";
  let author: string | undefined;
  let isbn: string | undefined;

  const clippings: Clipping[] = [];
  let quote: string[] = [];
  let page: number | undefined;
  let note: string | undefined;
  let inQuote = false;

  const flush = () => {
    const text = quote.join(" ").replace(/\s+/g, " ").trim();
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
    inQuote = false;
  };

  for (const raw of lines) {
    const line = raw.trim();

    if (line.startsWith(">")) {
      if (!inQuote) flush();
      inQuote = true;
      quote.push(line.replace(/^>\s?/, ""));
      continue;
    }

    if (FOOTER.test(line)) {
      flush();
      break;
    }

    if (!inQuote) {
      const heading = line.match(/^#\s+(.+)$/);
      if (heading && !title) {
        title = heading[1]!.replace(/^Highlights for\s+/i, "").trim();
        continue;
      }
      const byline = line.match(/^###\s+(.+)$/);
      if (byline && !author) {
        author = byline[1]!.trim();
        continue;
      }
      const isbnLine = line.match(/^ISBN:\s*(\S+)/i);
      if (isbnLine && !isbn) {
        isbn = isbnLine[1]!.trim();
        continue;
      }
      continue;
    }

    // Within a block: a blank line ends it; otherwise pick up its metadata.
    if (line === "") {
      flush();
      continue;
    }
    const pageLine = line.match(/^p\.?\s*(\d+)/i);
    if (pageLine) {
      page = Number(pageLine[1]);
      continue;
    }
    const noteLine = line.match(/^Note:\s*(.+)$/i);
    if (noteLine) {
      note = noteLine[1]!.trim();
      continue;
    }
    // Tags and any other metadata lines are ignored.
  }
  flush();

  return {
    title,
    ...(author ? { author } : {}),
    ...(isbn ? { isbn } : {}),
    clippings,
  };
}
