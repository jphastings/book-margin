import { expect, test } from "vite-plus/test";
import { toMarginNote, type MapOptions } from "../src/mapper.ts";
import type { KindleHighlight } from "../src/types.ts";

const OPTS: MapOptions = {
  source: "urn:isbn:9780135957059",
  conformsTo: "https://kindle-margin.byjp.me/ns/kindle-location",
  generator: { id: "https://kindle-margin.byjp.me", name: "Kindle Margin" },
  importedAt: "2026-06-27T00:00:00.000Z",
};

test("a bare highlight maps to a highlighting note with a quote + location fragment", () => {
  const highlight: KindleHighlight = {
    kind: "highlight",
    bookTitle: "The Pragmatic Programmer",
    asin: "B0046LU7H0",
    exact: "Care about your craft.",
    color: "yellow",
    locationStart: 792,
    locationEnd: 794,
    page: 52,
    createdAt: "2020-01-05T14:23:01.000Z",
  };

  const note = toMarginNote(highlight, OPTS);

  expect(note).toMatchObject({
    $type: "at.margin.note",
    motivation: "highlighting",
    color: "yellow",
    createdAt: "2020-01-05T14:23:01.000Z",
    target: {
      source: "urn:isbn:9780135957059",
      title: "The Pragmatic Programmer",
      selector: {
        type: "TextQuoteSelector",
        exact: "Care about your craft.",
        refinedBy: {
          type: "FragmentSelector",
          conformsTo: "https://kindle-margin.byjp.me/ns/kindle-location",
          value: "asin=B0046LU7H0&location=792-794&page=52",
        },
      },
    },
  });
  expect(note.body).toBeUndefined();
});

test("a highlight with a note becomes a commenting note carrying the note body", () => {
  const note = toMarginNote(
    {
      kind: "highlight",
      bookTitle: "Some Book",
      exact: "the highlighted span",
      note: "why this matters",
      locationStart: 10,
    },
    OPTS,
  );

  expect(note.motivation).toBe("commenting");
  expect(note.body).toEqual({ value: "why this matters", format: "text/plain" });
  expect(note.target.selector?.exact).toBe("the highlighted span");
});

test("a standalone note (no highlighted text) targets the FragmentSelector directly", () => {
  const note = toMarginNote(
    { kind: "note", bookTitle: "Some Book", exact: "", note: "a margin note", locationStart: 40 },
    OPTS,
  );

  expect(note.target.selector).toEqual({
    type: "FragmentSelector",
    conformsTo: OPTS.conformsTo,
    value: "location=40",
  });
});

test("omits the selector entirely when there is no text and no location", () => {
  const note = toMarginNote(
    { kind: "note", bookTitle: "Some Book", exact: "", note: "book-level thought" },
    OPTS,
  );
  expect(note.target.selector).toBeUndefined();
});

test("falls back to importedAt when the highlight is undated", () => {
  const note = toMarginNote({ kind: "highlight", bookTitle: "B", exact: "x" }, OPTS);
  expect(note.createdAt).toBe(OPTS.importedAt);
});
