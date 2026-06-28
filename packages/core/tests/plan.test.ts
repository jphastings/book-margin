import { expect, test } from "vite-plus/test";
import { planSync } from "../src/plan.ts";
import type { KindleHighlight } from "../src/types.ts";

const emptyResults = (() =>
  Promise.resolve(
    new Response(JSON.stringify({ results: { bindings: [] }, docs: [] }), { status: 200 }),
  )) as typeof globalThis.fetch;

const OPTIONS = {
  conformsTo: "https://kindle-margin.byjp.me/ns/kindle-location",
  importedAt: "2026-06-27T00:00:00.000Z",
  resolve: { overrides: { B0046LU7H0: "9780135957059" }, fetch: emptyResults },
};

function highlight(asin: string, title: string, exact: string): KindleHighlight {
  return {
    kind: "highlight",
    bookTitle: title,
    asin,
    exact,
    createdAt: "2026-06-27T00:00:00.000Z",
  };
}

test("plans resolved books with rkeys and leaves unresolved books without one", async () => {
  const plan = await planSync(
    [
      highlight("B0046LU7H0", "The Pragmatic Programmer", "a"),
      highlight("B0UNKNOWN0", "Unknown 999", "b"),
    ],
    OPTIONS,
  );

  const resolved = plan.find((b) => b.book.asin === "B0046LU7H0")!;
  const unresolved = plan.find((b) => b.book.asin === "B0UNKNOWN0")!;

  expect(resolved.isbn13).toBe("9780135957059");
  expect(resolved.entries[0]!.rkey).toMatch(
    /^[234567abcdefghij][234567abcdefghijklmnopqrstuvwxyz]{12}$/,
  );
  expect(resolved.entries[0]!.note?.target.source).toBe("urn:isbn:9780135957059");
  expect(unresolved.isbn13).toBeUndefined();
  expect(unresolved.entries[0]!.rkey).toBeUndefined();
  expect(unresolved.entries[0]!.highlight.exact).toBe("b");
});

test("collapses duplicate entries within a book", async () => {
  const dup = highlight("B0046LU7H0", "The Pragmatic Programmer", "same");
  const [book] = await planSync([dup, { ...dup }], OPTIONS);

  expect(book!.entries).toHaveLength(1);
  expect(book!.collapsed).toBe(1);
});
