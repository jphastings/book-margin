import { expect, test } from "vite-plus/test";
import { type IsbnStore, resolveBook, type ResolvedIsbn, slugifyBook } from "../src/resolver.ts";

type Route = (url: string) => unknown;

/** Back an IsbnStore with a plain Map for tests. */
function mapStore(map: Map<string, string>): IsbnStore {
  return {
    get: (asin) => Promise.resolve(map.get(asin)),
    set: (asin, isbn13) => {
      map.set(asin, isbn13);
      return Promise.resolve();
    },
  };
}

/** Build a fetch stub that returns JSON for the first matching route, else 404. */
function stubFetch(routes: Route[]): { fetch: typeof globalThis.fetch; calls: string[] } {
  const calls: string[] = [];
  const fetch = (async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    calls.push(url);
    for (const route of routes) {
      const body = route(url);
      if (body !== undefined) return new Response(JSON.stringify(body), { status: 200 });
    }
    return new Response("not found", { status: 404 });
  }) as typeof globalThis.fetch;
  return { fetch, calls };
}

const wikidata =
  (asin: string, isbn13: string): Route =>
  (url) =>
    url.includes("wikidata") && url.includes(encodeURIComponent(asin))
      ? { results: { bindings: [{ isbn13: { value: isbn13 } }] } }
      : undefined;

const openlibrary =
  (docs: Array<{ title?: string; author_name?: string[]; isbn?: string[] }>): Route =>
  (url) =>
    url.includes("openlibrary") ? { docs } : undefined;

test("an ISBN-10 ASIN resolves exactly without any network call", async () => {
  const { fetch, calls } = stubFetch([]);
  const { resolved } = await resolveBook({ asin: "0596805527", title: "JavaScript" }, { fetch });

  expect(resolved).toEqual<ResolvedIsbn>({
    isbn13: "9780596805524",
    via: "asin-isbn10",
    confidence: "exact",
  });
  expect(calls).toHaveLength(0);
});

test("a manual override takes precedence over everything", async () => {
  const { fetch } = stubFetch([]);
  const { resolved } = await resolveBook(
    { asin: "B0046LU7H0", title: "Anything" },
    { fetch, overrides: { B0046LU7H0: "978-0-596-80552-4" } },
  );

  expect(resolved).toMatchObject({ isbn13: "9780596805524", via: "override", confidence: "exact" });
});

test("a B0 ebook ASIN resolves exactly via Wikidata", async () => {
  const { fetch } = stubFetch([wikidata("B0046LU7H0", "9780135957059")]);
  const { resolved } = await resolveBook(
    { asin: "B0046LU7H0", title: "The Pragmatic Programmer" },
    { fetch },
  );

  expect(resolved).toMatchObject({ isbn13: "9780135957059", via: "wikidata", confidence: "exact" });
});

test("falls back to a fuzzy OpenLibrary match on title + author", async () => {
  const { fetch } = stubFetch([
    openlibrary([
      {
        title: "The Pragmatic Programmer",
        author_name: ["Andrew Hunt", "David Thomas"],
        isbn: ["0135957052", "9780135957059"],
      },
    ]),
  ]);
  const { resolved } = await resolveBook(
    { asin: "B0046LU7H0", title: "The Pragmatic Programmer", author: "Andrew Hunt;David Thomas" },
    { fetch },
  );

  expect(resolved).toMatchObject({
    isbn13: "9780135957059",
    via: "openlibrary",
    confidence: "fuzzy",
  });
});

test("a stored ASIN resolves from the store without any network call", async () => {
  const { fetch, calls } = stubFetch([]);
  const store = new Map([["B0046LU7H0", "0596805527"]]); // user may store ISBN-10
  const { resolved } = await resolveBook(
    { asin: "B0046LU7H0", title: "Anything" },
    { fetch, store: mapStore(store) },
  );

  expect(resolved).toMatchObject({ isbn13: "9780596805524", via: "store", confidence: "exact" });
  expect(calls).toHaveLength(0);
});

test("writes a resolved ASIN back to the ASIN store for next time", async () => {
  const { fetch } = stubFetch([wikidata("B0046LU7H0", "9780135957059")]);
  const store = new Map<string, string>();
  await resolveBook(
    { asin: "B0046LU7H0", title: "The Pragmatic Programmer" },
    { fetch, store: mapStore(store) },
  );

  expect(store.get("B0046LU7H0")).toBe("9780135957059");
});

test("caches a resolved no-ASIN book in the title store", async () => {
  const { fetch } = stubFetch([
    openlibrary([{ title: "Loka", author_name: ["S.B. Divya"], isbn: ["9780135957059"] }]),
  ]);
  const titles = new Map<string, string>();
  const book = { title: "Loka (The Alloy Era)", author: "Divya, S.B." };

  await resolveBook(book, { fetch, titleStore: mapStore(titles) });

  expect(titles.get(slugifyBook(book))).toBe("9780135957059");
});

test("a no-ASIN book resolves from the title store, beating the network", async () => {
  const { fetch, calls } = stubFetch([openlibrary([])]);
  const book = { title: "The Subtle Art of Folding Space", author: "Chu, John" };
  const titles = new Map([[slugifyBook(book), "9780135957059"]]);

  const { resolved } = await resolveBook(book, { fetch, titleStore: mapStore(titles) });

  expect(resolved).toMatchObject({ isbn13: "9780135957059", via: "store", confidence: "exact" });
  expect(calls).toHaveLength(0);
});

test("slugifyBook builds a stable title+author slug", () => {
  expect(slugifyBook({ title: "The Subtle Art of Folding Space", author: "Chu, John" })).toBe(
    "the-subtle-art-of-folding-space--chu-john",
  );
  expect(slugifyBook({ title: "Loka (The Alloy Era)" })).toBe("loka-the-alloy-era");
});

test("resolves a book whose title carries a series suffix (parenthetical stripped)", async () => {
  const { fetch, calls } = stubFetch([
    openlibrary([{ title: "Loka", author_name: ["S.B. Divya"], isbn: ["9780135957059"] }]),
  ]);
  const { resolved } = await resolveBook(
    { title: "Loka (The Alloy Era)", author: "Divya, S.B." },
    { fetch },
  );

  expect(resolved).toMatchObject({ via: "openlibrary" });
  expect(calls[0]).toContain("title=Loka&");
  expect(calls[0]).not.toContain("Alloy");
});

test("strips the subtitle from the OpenLibrary query but still matches the full title", async () => {
  const { fetch, calls } = stubFetch([
    openlibrary([{ title: "JavaScript", author_name: ["David Flanagan"], isbn: ["0596805527"] }]),
  ]);
  const { resolved } = await resolveBook(
    { title: "JavaScript: The Definitive Guide", author: "David Flanagan" },
    { fetch },
  );

  expect(resolved).toMatchObject({ isbn13: "9780596805524", via: "openlibrary" });
  expect(calls[0]).toContain("title=JavaScript&");
  expect(calls[0]).not.toContain("Definitive");
});

test("holds the book back (strict) when the OpenLibrary title does not match", async () => {
  const { fetch } = stubFetch([
    openlibrary([{ title: "A Completely Different Book", isbn: ["9780135957059"] }]),
  ]);
  const { resolved } = await resolveBook({ title: "The Pragmatic Programmer" }, { fetch });

  expect(resolved).toBeUndefined();
});

test("holds the book back when the author does not match", async () => {
  const { fetch } = stubFetch([
    openlibrary([
      { title: "The Pragmatic Programmer", author_name: ["Someone Else"], isbn: ["9780135957059"] },
    ]),
  ]);
  const { resolved } = await resolveBook(
    { title: "The Pragmatic Programmer", author: "Andrew Hunt" },
    { fetch },
  );

  expect(resolved).toBeUndefined();
});

test("caches a resolution so repeated books don't refetch", async () => {
  const { fetch, calls } = stubFetch([wikidata("B0046LU7H0", "9780135957059")]);
  const cache = new Map<string, ResolvedIsbn | null>();
  const book = { asin: "B0046LU7H0", title: "The Pragmatic Programmer" };

  await resolveBook(book, { fetch, cache });
  await resolveBook(book, { fetch, cache });

  expect(calls).toHaveLength(1);
});
