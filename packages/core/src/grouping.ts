import type { Clipping } from "@byjp/kindle-clippings";
import type { BookKey } from "./resolver.ts";

export interface BookGroup {
  book: BookKey;
  clippings: Clipping[];
}

/** Group clippings by the book they belong to (title + author). */
export function groupByBook(clippings: Clipping[]): BookGroup[] {
  const groups = new Map<string, BookGroup>();
  for (const clipping of clippings) {
    const book = toBookKey(clipping);
    const key = `${book.title.toLowerCase()}|${(book.author ?? "").toLowerCase()}`;
    const group = groups.get(key);
    if (group) group.clippings.push(clipping);
    else groups.set(key, { book, clippings: [clipping] });
  }
  return [...groups.values()];
}

function toBookKey(clipping: Clipping): BookKey {
  const book: BookKey = { title: clipping.title };
  if (clipping.author) book.author = clipping.author;
  return book;
}
