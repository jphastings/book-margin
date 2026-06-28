import type { Clipping } from "@byjp/kindle-clippings";
import { groupByBook } from "./grouping.ts";
import type { MarginGenerator, MarginNote } from "./margin.ts";
import { toMarginNote } from "./mapper.ts";
import {
  type BookKey,
  type IsbnSource,
  resolveBook,
  type ResolvedIsbnCache,
  type ResolveOptions,
} from "./resolver.ts";
import { deterministicTid } from "./tid.ts";

/** One annotation in a plan: the clipping, plus the record/rkey when the book resolved. */
export interface PlannedEntry {
  clipping: Clipping;
  /** The deterministic record key. Present only when the book resolved to an ISBN. */
  rkey?: string;
  note?: MarginNote;
}

/** A book in a sync plan and the records it would produce. */
export interface PlannedBook {
  book: BookKey;
  /** The resolved ISBN-13, or undefined when no confident match was found. */
  isbn13?: string;
  via?: IsbnSource;
  entries: PlannedEntry[];
  /** How many duplicate entries (same rkey) were collapsed. */
  collapsed: number;
  /** The locator namespace these records' fragments conform to (carried for re-planning). */
  conformsTo: string;
}

export interface PlanOptions {
  conformsTo: string;
  importedAt: string;
  generator?: MarginGenerator;
  resolve?: ResolveOptions;
}

/**
 * Compute what a sync *would* write, without touching the repo: group by book,
 * resolve each to an ISBN, and map every clipping to a record with its
 * deterministic rkey. Books that don't resolve come back with `isbn13`
 * undefined and entries that carry only the raw clipping. This is the basis for
 * both the CLI sync and the web review UI.
 */
export async function planSync(
  clippings: Clipping[],
  options: PlanOptions,
): Promise<PlannedBook[]> {
  const cache: ResolvedIsbnCache = options.resolve?.cache ?? new Map();
  const resolveOptions: ResolveOptions = { ...options.resolve, cache };
  const plan: PlannedBook[] = [];
  for (const group of groupByBook(clippings)) {
    plan.push(await planBook(group.book, group.clippings, { ...options, resolve: resolveOptions }));
  }
  return plan;
}

/** Plan a single book — useful for re-planning after the user supplies an ISBN. */
export async function planBook(
  book: BookKey,
  clippings: Clipping[],
  options: PlanOptions,
): Promise<PlannedBook> {
  const { resolved } = await resolveBook(book, options.resolve ?? {});
  if (!resolved) {
    return {
      book,
      entries: clippings.map((clipping) => ({ clipping })),
      collapsed: 0,
      conformsTo: options.conformsTo,
    };
  }

  const source = `urn:isbn:${resolved.isbn13}`;
  const seen = new Set<string>();
  const entries: PlannedEntry[] = [];
  let collapsed = 0;
  for (const clipping of clippings) {
    const note = toMarginNote(clipping, {
      source,
      conformsTo: options.conformsTo,
      importedAt: options.importedAt,
      ...(options.generator ? { generator: options.generator } : {}),
    });
    // Undated annotations (e.g. Highlighted exports) use a fixed epoch so the
    // rkey is a pure function of identity and re-imports stay idempotent rather
    // than minting a new key each time; the record's createdAt still falls back
    // to importedAt in the mapper.
    const rkey = await deterministicTid(clipping.id, clipping.addedAt ?? "");
    if (seen.has(rkey)) {
      collapsed++;
      continue;
    }
    seen.add(rkey);
    entries.push({ clipping, rkey, note });
  }
  return {
    book,
    isbn13: resolved.isbn13,
    via: resolved.via,
    entries,
    collapsed,
    conformsTo: options.conformsTo,
  };
}
