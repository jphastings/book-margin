import { type Clipping, clippingId } from "@byjp/kindle-clippings";
import { expect, test } from "vite-plus/test";
import type { MarginNote } from "../src/margin.ts";
import { type IsbnStore, slugifyBook } from "../src/resolver.ts";
import { type RepoClient, type SyncOptions, syncHighlights } from "../src/sync.ts";

const emptyResults = (() =>
  Promise.resolve(
    new Response(JSON.stringify({ results: { bindings: [] }, docs: [] }), { status: 200 }),
  )) as typeof globalThis.fetch;

function titleStore(byTitle: Record<string, string>): IsbnStore {
  const bySlug = new Map(
    Object.entries(byTitle).map(([title, isbn]) => [slugifyBook({ title }), isbn]),
  );
  return { get: (slug) => Promise.resolve(bySlug.get(slug)), set: () => Promise.resolve() };
}

const OPTIONS: SyncOptions = {
  conformsTo: "https://kindle-margin.byjp.me/ns/kindle-location",
  importedAt: "2026-06-27T00:00:00.000Z",
  resolve: {
    titleStore: titleStore({
      "The Pragmatic Programmer": "9780135957059",
      JavaScript: "9780596805524",
    }),
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

class FakeRepo implements RepoClient {
  put: Array<{ rkey: string; record: MarginNote }> = [];
  putNote(rkey: string, record: MarginNote) {
    this.put.push({ rkey, record });
    return Promise.resolve({ uri: `at://did:fake/at.margin.note/${rkey}` });
  }
}

test("writes resolved clippings at deterministic TID rkeys", async () => {
  const repo = new FakeRepo();
  const report = await syncHighlights(
    [clip("The Pragmatic Programmer", "a"), clip("JavaScript", "b")],
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

test("the same clipping always targets the same rkey (idempotent re-sync)", async () => {
  const first = new FakeRepo();
  const second = new FakeRepo();
  const input = [clip("The Pragmatic Programmer", "a")];

  await syncHighlights(input, first, OPTIONS);
  await syncHighlights(input, second, OPTIONS);

  expect(first.put[0]!.rkey).toBe(second.put[0]!.rkey);
});

test("collapses clippings that share an rkey within a run", async () => {
  const repo = new FakeRepo();
  const dup = clip("The Pragmatic Programmer", "same text");
  const report = await syncHighlights([dup, { ...dup }], repo, OPTIONS);

  expect(report.written).toHaveLength(1);
  expect(report.skippedDuplicate).toBe(1);
  expect(repo.put).toHaveLength(1);
});

test("holds back clippings for books that can't be resolved", async () => {
  const repo = new FakeRepo();
  const report = await syncHighlights([clip("Totally Unknown Title 98765", "x")], repo, OPTIONS);

  expect(report.resolvedBooks).toBe(0);
  expect(report.held).toEqual([{ book: { title: "Totally Unknown Title 98765" }, count: 1 }]);
  expect(repo.put).toHaveLength(0);
});

test("dry run resolves and keys but never writes", async () => {
  const repo = new FakeRepo();
  const report = await syncHighlights([clip("The Pragmatic Programmer", "a")], repo, {
    ...OPTIONS,
    dryRun: true,
  });

  expect(report.written).toHaveLength(1);
  expect(repo.put).toHaveLength(0);
});
