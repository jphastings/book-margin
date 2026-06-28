import { isIsbn10Asin, toIsbn13 } from "./isbn.ts";

export type IsbnSource = "override" | "store" | "asin-isbn10" | "wikidata" | "openlibrary";

export interface ResolvedIsbn {
  isbn13: string;
  via: IsbnSource;
  confidence: "exact" | "fuzzy";
}

export interface BookKey {
  asin?: string;
  title: string;
  author?: string;
}

/** A shared resolution cache; `null` records a book we looked up but couldn't resolve. */
export type ResolvedIsbnCache = Map<string, ResolvedIsbn | null>;

/**
 * A persistent ASIN → ISBN store. Read as a high-priority resolution tier and
 * written whenever an ASIN-bearing book is resolved, so lookups survive across
 * runs and can be curated by hand. Implemented per host (filesystem in the CLI,
 * web storage in the browser). `get` may return an ISBN-10 or ISBN-13.
 */
export interface IsbnStore {
  get(asin: string): Promise<string | undefined>;
  set(asin: string, isbn13: string): Promise<void>;
}

export interface ResolveOptions {
  /** Injectable fetch, for testing and non-DOM hosts. Defaults to global fetch. */
  fetch?: typeof globalThis.fetch;
  /** Manual `asin → isbn` overrides for books that can't be resolved automatically. */
  overrides?: Record<string, string>;
  /** Persistent ASIN → ISBN store, checked before the network and written after resolving. */
  store?: IsbnStore;
  /**
   * Persistent title-slug → ISBN store for books with no ASIN (e.g. My
   * Clippings.txt). A high-priority tier keyed by {@link slugifyBook}: read
   * before the network and written after a fresh resolution, so it both caches
   * lookups and accepts hand-curated pins.
   */
  titleStore?: IsbnStore;
  /** Resolution cache shared across a run, keyed by book. Mutated in place. */
  cache?: ResolvedIsbnCache;
  /** Descriptive UA for the Wikidata query service (ignored by browsers). */
  userAgent?: string;
}

export interface ResolveResult {
  book: BookKey;
  /** The resolved ISBN, or undefined when strict resolution found nothing (held back). */
  resolved?: ResolvedIsbn;
}

const WIKIDATA_ENDPOINT = "https://query.wikidata.org/sparql";
const OPENLIBRARY_SEARCH = "https://openlibrary.org/search.json";

/**
 * Resolve a book to a canonical ISBN-13 through a keyless, CORS-open chain:
 * manual override → ASIN-is-ISBN-10 → Wikidata exact ASIN match → OpenLibrary
 * fuzzy title+author search. Returns `resolved: undefined` when nothing matches
 * confidently (strict mode holds the book back rather than guessing).
 */
export async function resolveBook(
  book: BookKey,
  options: ResolveOptions = {},
): Promise<ResolveResult> {
  const cache = options.cache;
  const cacheKey = book.asin ?? `${normalizeText(book.title)}|${normalizeText(book.author ?? "")}`;
  if (cache?.has(cacheKey)) {
    return { book, resolved: cache.get(cacheKey) ?? undefined };
  }

  const resolved = await resolveUncached(book, options);
  cache?.set(cacheKey, resolved ?? null);

  // Persist a freshly looked-up resolution so future runs skip the network:
  // ASIN-bearing books by ASIN, everything else by title slug.
  if (resolved && resolved.via !== "store") {
    if (book.asin && options.store) await options.store.set(book.asin, resolved.isbn13);
    else if (options.titleStore) await options.titleStore.set(slugifyBook(book), resolved.isbn13);
  }

  return { book, resolved: resolved ?? undefined };
}

async function resolveUncached(
  book: BookKey,
  options: ResolveOptions,
): Promise<ResolvedIsbn | undefined> {
  const { asin } = book;

  if (asin && options.overrides?.[asin]) {
    const isbn13 = toIsbn13(options.overrides[asin]!);
    if (isbn13) return { isbn13, via: "override", confidence: "exact" };
  }

  if (asin && options.store) {
    const stored = await options.store.get(asin);
    const isbn13 = stored ? toIsbn13(stored) : undefined;
    if (isbn13) return { isbn13, via: "store", confidence: "exact" };
  }

  if (options.titleStore) {
    const stored = await options.titleStore.get(slugifyBook(book));
    const isbn13 = stored ? toIsbn13(stored) : undefined;
    if (isbn13) return { isbn13, via: "store", confidence: "exact" };
  }

  if (asin && isIsbn10Asin(asin)) {
    const isbn13 = toIsbn13(asin);
    if (isbn13) return { isbn13, via: "asin-isbn10", confidence: "exact" };
  }

  if (asin) {
    const fromWikidata = await queryWikidata(asin, options);
    if (fromWikidata) return { isbn13: fromWikidata, via: "wikidata", confidence: "exact" };
  }

  const fromOpenLibrary = await searchOpenLibrary(book, options);
  if (fromOpenLibrary) return { isbn13: fromOpenLibrary, via: "openlibrary", confidence: "fuzzy" };

  return undefined;
}

interface SparqlResults {
  results?: { bindings?: Array<Record<string, { value?: string }>> };
}

async function queryWikidata(asin: string, options: ResolveOptions): Promise<string | undefined> {
  const doFetch = options.fetch ?? globalThis.fetch;
  const query = `SELECT ?isbn13 ?isbn10 WHERE { ?item wdt:P5749 "${escapeSparql(asin)}". OPTIONAL { ?item wdt:P212 ?isbn13 } OPTIONAL { ?item wdt:P957 ?isbn10 } } LIMIT 5`;
  const url = `${WIKIDATA_ENDPOINT}?format=json&query=${encodeURIComponent(query)}`;

  const headers: Record<string, string> = { Accept: "application/sparql-results+json" };
  if (options.userAgent) headers["User-Agent"] = options.userAgent;

  const response = await safeFetch(doFetch, url, { headers });
  if (!response) return undefined;

  const data = (await response.json()) as SparqlResults;
  for (const binding of data.results?.bindings ?? []) {
    const isbn = binding.isbn13?.value ?? binding.isbn10?.value;
    const isbn13 = isbn ? toIsbn13(isbn) : undefined;
    if (isbn13) return isbn13;
  }
  return undefined;
}

interface OpenLibrarySearch {
  docs?: Array<{ title?: string; author_name?: string[]; isbn?: string[] }>;
}

async function searchOpenLibrary(
  book: BookKey,
  options: ResolveOptions,
): Promise<string | undefined> {
  const doFetch = options.fetch ?? globalThis.fetch;
  const params = new URLSearchParams({
    // OpenLibrary's title field matches poorly when a subtitle is included
    // ("JavaScript: The Definitive Guide" finds nothing), so query the main
    // title only. Precision is still enforced by titleMatches below.
    title: mainTitle(book.title),
    fields: "title,author_name,isbn",
    limit: "5",
  });
  if (book.author) params.set("author", book.author);
  const url = `${OPENLIBRARY_SEARCH}?${params.toString()}`;

  const response = await safeFetch(doFetch, url, {});
  if (!response) return undefined;

  const data = (await response.json()) as OpenLibrarySearch;
  for (const doc of data.docs ?? []) {
    if (!titleMatches(book.title, doc.title)) continue;
    if (book.author && !authorMatches(book.author, doc.author_name)) continue;
    const isbn13 = pickIsbn13(doc.isbn);
    if (isbn13) return isbn13;
  }
  return undefined;
}

function pickIsbn13(isbns: string[] | undefined): string | undefined {
  if (!isbns) return undefined;
  for (const isbn of isbns) {
    const isbn13 = toIsbn13(isbn);
    if (isbn13) return isbn13;
  }
  return undefined;
}

/**
 * The core title for searching: drop a trailing series/edition parenthetical
 * ("Loka (The Alloy Era)" → "Loka") and any subtitle after ": " or " — ".
 * OpenLibrary's title field doesn't match these suffixes; precision is still
 * enforced by titleMatches, which compares against the full title.
 */
function mainTitle(title: string): string {
  return title
    .replace(/\s*\([^()]*\)\s*$/, "")
    .split(/:|\s[–—-]\s/)[0]!
    .trim();
}

function titleMatches(wanted: string, candidate: string | undefined): boolean {
  if (!candidate) return false;
  const a = normalizeText(wanted);
  const b = normalizeText(candidate);
  if (!a || !b) return false;
  return a === b || a.startsWith(b) || b.startsWith(a);
}

function authorMatches(wanted: string, candidates: string[] | undefined): boolean {
  if (!candidates?.length) return false;
  const surname = lastNameToken(wanted);
  if (!surname) return false;
  return candidates.some((name) => normalizeText(name).split(" ").includes(surname));
}

function lastNameToken(author: string): string | undefined {
  // Take the first listed author ("A;B" or "A & B") then its surname,
  // handling both "First Last" and "Last, First".
  const first = author.split(/[;&]/)[0]!.trim();
  if (first.includes(",")) return normalizeText(first.split(",")[0]!).split(" ").pop();
  return normalizeText(first).split(" ").filter(Boolean).pop();
}

/**
 * A filesystem-safe slug identifying a book by title and author, e.g.
 * "the-subtle-art-of-folding-space--john-chu". Used as the key for the
 * title-store tier so a no-ASIN book can be pinned to an ISBN by hand.
 */
export function slugifyBook(book: BookKey): string {
  return [slugPart(book.title), slugPart(book.author ?? "")].filter(Boolean).join("--");
}

function slugPart(text: string): string {
  return normalizeText(text).replace(/\s+/g, "-");
}

function normalizeText(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function escapeSparql(value: string): string {
  return value.replace(/["\\]/g, "\\$&");
}

const REQUEST_TIMEOUT_MS = 8000;
const MAX_ATTEMPTS = 3;

/**
 * Fetch with a per-attempt timeout and a couple of retries. Transient network
 * failures would otherwise be indistinguishable from a genuine "no match" and
 * cause books to be wrongly held back. A non-ok HTTP response is not retried.
 */
async function safeFetch(
  doFetch: typeof globalThis.fetch,
  url: string,
  init: RequestInit,
): Promise<Response | undefined> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await doFetch(url, {
        ...init,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      return response.ok ? response : undefined;
    } catch {
      if (attempt < MAX_ATTEMPTS) await delay(250 * attempt);
    }
  }
  return undefined;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
