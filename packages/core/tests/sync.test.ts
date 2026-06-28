import { expect, test } from "vite-plus/test";
import type { MarginNote } from "../src/margin.ts";
import { type RepoClient, type SyncOptions, syncHighlights } from "../src/sync.ts";
import type { KindleHighlight } from "../src/types.ts";

const OPTIONS: SyncOptions = {
  conformsTo: "https://kindle-margin.byjp.me/ns/kindle-location",
  importedAt: "2026-06-27T00:00:00.000Z",
  // Force deterministic, offline resolution for two known books.
  resolve: { overrides: { B0046LU7H0: "9780135957059", B0CCCCCCCC: "9780596805524" } },
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

class FakeRepo implements RepoClient {
  put: Array<{ rkey: string; record: MarginNote }> = [];
  putNote(rkey: string, record: MarginNote) {
    this.put.push({ rkey, record });
    return Promise.resolve({ uri: `at://did:fake/at.margin.note/${rkey}` });
  }
}

test("writes resolved highlights at deterministic TID rkeys", async () => {
  const repo = new FakeRepo();
  const report = await syncHighlights(
    [
      highlight("B0046LU7H0", "The Pragmatic Programmer", "a"),
      highlight("B0CCCCCCCC", "JavaScript", "b"),
    ],
    repo,
    OPTIONS,
  );

  expect(report.resolvedBooks).toBe(2);
  expect(report.written).toHaveLength(2);
  expect(repo.put).toHaveLength(2);
  for (const { rkey } of repo.put) {
    expect(rkey).toMatch(/^[234567abcdefghij][234567abcdefghijklmnopqrstuvwxyz]{12}$/);
  }
});

test("the same highlight always targets the same rkey (idempotent re-sync)", async () => {
  const first = new FakeRepo();
  const second = new FakeRepo();
  const input = [highlight("B0046LU7H0", "The Pragmatic Programmer", "a")];

  await syncHighlights(input, first, OPTIONS);
  await syncHighlights(input, second, OPTIONS);

  expect(first.put[0]!.rkey).toBe(second.put[0]!.rkey);
});

test("collapses annotations that share an rkey within a run", async () => {
  const repo = new FakeRepo();
  const dup = highlight("B0046LU7H0", "The Pragmatic Programmer", "same text");
  const report = await syncHighlights([dup, { ...dup }], repo, OPTIONS);

  expect(report.written).toHaveLength(1);
  expect(report.skippedDuplicate).toBe(1);
  expect(repo.put).toHaveLength(1);
});

test("holds back annotations for books that can't be resolved", async () => {
  const repo = new FakeRepo();
  const report = await syncHighlights(
    [highlight("B0UNKNOWN0", "Totally Unknown Title 98765", "x")],
    repo,
    { ...OPTIONS, resolve: { ...OPTIONS.resolve, fetch: emptyResults } },
  );

  expect(report.resolvedBooks).toBe(0);
  expect(report.held).toEqual([
    { book: { asin: "B0UNKNOWN0", title: "Totally Unknown Title 98765" }, count: 1 },
  ]);
  expect(repo.put).toHaveLength(0);
});

test("dry run resolves and keys but never writes", async () => {
  const repo = new FakeRepo();
  const report = await syncHighlights(
    [highlight("B0046LU7H0", "The Pragmatic Programmer", "a")],
    repo,
    {
      ...OPTIONS,
      dryRun: true,
    },
  );

  expect(report.written).toHaveLength(1);
  expect(repo.put).toHaveLength(0);
});

const emptyResults = (() =>
  Promise.resolve(
    new Response(JSON.stringify({ results: { bindings: [] }, docs: [] }), { status: 200 }),
  )) as typeof globalThis.fetch;
