import { type Clipping, clippingId } from "@byjp/kindle-clippings";
import { expect, test } from "vite-plus/test";
import { planSync } from "../src/plan.ts";
import { type IsbnStore, slugifyBook } from "../src/resolver.ts";

const emptyResults = (() =>
  Promise.resolve(
    new Response(JSON.stringify({ results: { bindings: [] }, docs: [] }), { status: 200 }),
  )) as typeof globalThis.fetch;

/** A title-keyed ISBN store, the offline resolution path for clippings (no ASIN). */
function titleStore(byTitle: Record<string, string>): IsbnStore {
  const bySlug = new Map(
    Object.entries(byTitle).map(([title, isbn]) => [slugifyBook({ title }), isbn]),
  );
  return { get: (slug) => Promise.resolve(bySlug.get(slug)), set: () => Promise.resolve() };
}

const OPTIONS = {
  conformsTo: "https://kindle-margin.byjp.me/ns/kindle-location",
  importedAt: "2026-06-27T00:00:00.000Z",
  resolve: {
    titleStore: titleStore({ "The Pragmatic Programmer": "9780135957059" }),
    fetch: emptyResults,
  },
};

function clip(title: string, text: string, location = { start: 1, end: 2 }): Clipping {
  return {
    id: clippingId({ title, location }),
    kind: "highlight",
    title,
    text,
    location,
    addedAt: "2026-06-27T00:00:00.000Z",
  };
}

test("plans resolved books with rkeys and leaves unresolved books without one", async () => {
  const plan = await planSync(
    [clip("The Pragmatic Programmer", "a"), clip("Unknown 999", "b")],
    OPTIONS,
  );

  const resolved = plan.find((b) => b.book.title === "The Pragmatic Programmer")!;
  const unresolved = plan.find((b) => b.book.title === "Unknown 999")!;

  expect(resolved.isbn13).toBe("9780135957059");
  expect(resolved.entries[0]!.rkey).toMatch(
    /^[234567abcdefghij][234567abcdefghijklmnopqrstuvwxyz]{12}$/,
  );
  expect(resolved.entries[0]!.note?.target.source).toBe("urn:isbn:9780135957059");
  expect(unresolved.isbn13).toBeUndefined();
  expect(unresolved.entries[0]!.rkey).toBeUndefined();
  expect(unresolved.entries[0]!.clipping.text).toBe("b");
});

test("collapses duplicate entries within a book", async () => {
  const dup = clip("The Pragmatic Programmer", "same");
  const [book] = await planSync([dup, { ...dup }], OPTIONS);

  expect(book!.entries).toHaveLength(1);
  expect(book!.collapsed).toBe(1);
});
