import type { BookKey } from "./resolver.ts";
import type { KindleHighlight } from "./types.ts";

export interface BookGroup {
  book: BookKey;
  highlights: KindleHighlight[];
}

/** Group annotations by the book they belong to (by ASIN, else title+author). */
export function groupByBook(highlights: KindleHighlight[]): BookGroup[] {
  const groups = new Map<string, BookGroup>();
  for (const highlight of highlights) {
    const book = toBookKey(highlight);
    const key = book.asin ?? `${book.title.toLowerCase()}|${(book.author ?? "").toLowerCase()}`;
    const group = groups.get(key);
    if (group) group.highlights.push(highlight);
    else groups.set(key, { book, highlights: [highlight] });
  }
  return [...groups.values()];
}

function toBookKey(highlight: KindleHighlight): BookKey {
  const book: BookKey = { title: highlight.bookTitle };
  if (highlight.asin) book.asin = highlight.asin;
  if (highlight.author) book.author = highlight.author;
  return book;
}
