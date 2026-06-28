import type { Clipping } from "@byjp/kindle-clippings";
import type { MarginGenerator, MarginNote } from "./margin.ts";
import { type PlannedBook, planSync } from "./plan.ts";
import type { BookKey, ResolveOptions } from "./resolver.ts";

/**
 * The single atproto repo operation the sync needs. Implemented by each frontend
 * with its own auth so `core` stays free of any atproto client dependency.
 * `putNote` upserts at a caller-chosen rkey, which is what makes re-syncs
 * idempotent without reading the repo.
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
  /** When true, plan but don't write; `written` is the would-be records. */
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

/**
 * Run the full sync: plan what to write (resolve, map, key), then upsert each
 * record at its deterministic rkey (unless `dryRun`).
 */
export async function syncHighlights(
  clippings: Clipping[],
  client: RepoClient | undefined,
  options: SyncOptions,
): Promise<SyncReport> {
  const plan = await planSync(clippings, options);

  const resolved = plan.filter((book) => book.isbn13);
  const held: HeldBook[] = plan
    .filter((book) => !book.isbn13)
    .map((book) => ({ book: book.book, count: book.entries.length }));
  const skippedDuplicate = resolved.reduce((sum, book) => sum + book.collapsed, 0);
  const records = resolved.flatMap((book) => book.entries);

  if (options.dryRun || !client) {
    return {
      resolvedBooks: resolved.length,
      written: records.map((entry) => entry.note!),
      skippedDuplicate,
      held,
    };
  }

  const written: MarginNote[] = [];
  for (const entry of records) {
    await client.putNote(entry.rkey!, entry.note!);
    written.push(entry.note!);
  }
  return { resolvedBooks: resolved.length, written, skippedDuplicate, held };
}

export type { PlannedBook };
