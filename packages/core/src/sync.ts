import { highlightSeed } from "./identity.ts";
import type { MarginGenerator, MarginNote } from "./margin.ts";
import { toMarginNote } from "./mapper.ts";
import {
  type BookKey,
  resolveBook,
  type ResolvedIsbnCache,
  type ResolveOptions,
} from "./resolver.ts";
import { deterministicTid } from "./tid.ts";
import type { KindleHighlight } from "./types.ts";

/**
 * The single atproto repo operation the sync needs. Implemented by each frontend
 * with its own auth (app password in the CLI, OAuth in the extension) so `core`
 * stays free of any atproto client dependency. `putNote` upserts at a caller-
 * chosen rkey, which is what makes re-syncs idempotent without reading the repo.
 */
export interface RepoClient {
  putNote(rkey: string, record: MarginNote): Promise<{ uri: string }>;
}

export interface SyncOptions {
  /** URI the Kindle-location FragmentSelector conforms to. */
  conformsTo: string;
  /** Fallback `createdAt` for undated annotations (keep stable for reproducibility). */
  importedAt: string;
  generator?: MarginGenerator;
  resolve?: ResolveOptions;
  /** When true, resolve/map/key but don't write; `written` is the would-be records. */
  dryRun?: boolean;
}

export interface HeldBook {
  book: BookKey;
  /** How many annotations were held back with this book. */
  count: number;
}

export interface SyncReport {
  resolvedBooks: number;
  written: MarginNote[];
  /** Annotations that mapped to an rkey already produced this run (true duplicates). */
  skippedDuplicate: number;
  /** Books that strict ISBN resolution couldn't place; their annotations were not written. */
  held: HeldBook[];
}

interface BookGroup {
  book: BookKey;
  highlights: KindleHighlight[];
}

interface KeyedNote {
  rkey: string;
  note: MarginNote;
}

/**
 * Run the full sync: group annotations by book, resolve each book to an ISBN
 * (strict — unresolved books are held), map to `at.margin.note`, derive a
 * deterministic rkey per record, collapse any that share one, and upsert the
 * rest (unless `dryRun`).
 */
export async function syncHighlights(
  highlights: KindleHighlight[],
  client: RepoClient | undefined,
  options: SyncOptions,
): Promise<SyncReport> {
  const cache: ResolvedIsbnCache = options.resolve?.cache ?? new Map();
  const resolveOptions: ResolveOptions = { ...options.resolve, cache };

  const keyed: KeyedNote[] = [];
  const held: HeldBook[] = [];
  let resolvedBooks = 0;

  for (const group of groupByBook(highlights)) {
    const { resolved } = await resolveBook(group.book, resolveOptions);
    if (!resolved) {
      held.push({ book: group.book, count: group.highlights.length });
      continue;
    }
    resolvedBooks++;
    const source = `urn:isbn:${resolved.isbn13}`;
    for (const highlight of group.highlights) {
      const note = toMarginNote(highlight, {
        source,
        conformsTo: options.conformsTo,
        importedAt: options.importedAt,
        ...(options.generator ? { generator: options.generator } : {}),
      });
      const rkey = await deterministicTid(highlightSeed(highlight, source), note.createdAt);
      keyed.push({ rkey, note });
    }
  }

  const unique = dedupeByRkey(keyed);
  const skippedDuplicate = keyed.length - unique.length;

  if (options.dryRun || !client) {
    return { resolvedBooks, written: unique.map((k) => k.note), skippedDuplicate, held };
  }

  const written: MarginNote[] = [];
  for (const { rkey, note } of unique) {
    await client.putNote(rkey, note);
    written.push(note);
  }
  return { resolvedBooks, written, skippedDuplicate, held };
}

function dedupeByRkey(keyed: KeyedNote[]): KeyedNote[] {
  const seen = new Set<string>();
  const unique: KeyedNote[] = [];
  for (const entry of keyed) {
    if (seen.has(entry.rkey)) continue;
    seen.add(entry.rkey);
    unique.push(entry);
  }
  return unique;
}

function groupByBook(highlights: KindleHighlight[]): BookGroup[] {
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
