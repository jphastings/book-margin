import type { Clipping } from "@byjp/kindle-clippings";
import { expect, test } from "vite-plus/test";
import { type MapOptions, toMarginNote } from "../src/mapper.ts";

const OPTS: MapOptions = {
  source: "urn:isbn:9780135957059",
  conformsTo: "https://book-margin.byjp.me/ns/kindle-location",
  generator: { id: "https://book-margin.byjp.me", name: "Book Margin" },
  importedAt: "2026-06-27T00:00:00.000Z",
};

function clip(over: Partial<Clipping>): Clipping {
  return { id: "id", kind: "highlight", title: "A Book", text: "", ...over };
}

test("a bare highlight maps to a highlighting note with a quote + location fragment", () => {
  const note = toMarginNote(
    clip({
      title: "The Pragmatic Programmer",
      text: "Care about your craft.",
      location: { start: 792, end: 794 },
      page: "52",
      addedAt: "2020-01-05T14:23:01.000Z",
    }),
    OPTS,
  );

  expect(note).toMatchObject({
    $type: "at.margin.note",
    motivation: "highlighting",
    createdAt: "2020-01-05T14:23:01.000Z",
    target: {
      source: "urn:isbn:9780135957059",
      title: "The Pragmatic Programmer",
      selector: {
        type: "TextQuoteSelector",
        exact: "Care about your craft.",
        refinedBy: {
          type: "FragmentSelector",
          conformsTo: "https://book-margin.byjp.me/ns/kindle-location",
          value: "location=792-794&page=52",
        },
      },
    },
  });
  expect(note.body).toBeUndefined();
});

test("a highlight with a note becomes a commenting note carrying the note body", () => {
  const note = toMarginNote(
    clip({ text: "the highlighted span", note: "why this matters", location: { start: 10 } }),
    OPTS,
  );

  expect(note.motivation).toBe("commenting");
  expect(note.body).toEqual({ value: "why this matters", format: "text/plain" });
  expect(note.target.selector?.exact).toBe("the highlighted span");
});

test("a standalone note (no highlighted text) targets the FragmentSelector directly", () => {
  const note = toMarginNote(
    clip({ kind: "note", text: "", note: "a margin note", location: { start: 40 } }),
    OPTS,
  );

  expect(note.target.selector).toEqual({
    type: "FragmentSelector",
    conformsTo: OPTS.conformsTo,
    value: "location=40",
  });
});

test("a print page span becomes a page range fragment", () => {
  const note = toMarginNote(clip({ text: "from a physical book", page: ["18", "19"] }), OPTS);
  expect(note.target.selector?.refinedBy).toEqual({
    type: "FragmentSelector",
    conformsTo: OPTS.conformsTo,
    value: "page=18-19",
  });
});

test("percent-escapes a hyphen inside a single page label", () => {
  const note = toMarginNote(clip({ text: "x", page: "A-1" }), OPTS);
  expect(note.target.selector?.refinedBy?.value).toBe("page=A%2D1");
});

test("omits the selector entirely when there is no text and no location", () => {
  const note = toMarginNote(clip({ kind: "note", text: "", note: "book-level thought" }), OPTS);
  expect(note.target.selector).toBeUndefined();
});

test("falls back to importedAt when the clipping is undated", () => {
  const note = toMarginNote(clip({ text: "x" }), OPTS);
  expect(note.createdAt).toBe(OPTS.importedAt);
});
