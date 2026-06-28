import { expect, test } from "vite-plus/test";
import { highlightSeed } from "../src/identity.ts";
import type { KindleHighlight } from "../src/types.ts";

const base: KindleHighlight = {
  kind: "highlight",
  bookTitle: "B",
  exact: "x",
  locationStart: 10,
  locationEnd: 12,
};

test("seed combines book source, kind and location", () => {
  expect(highlightSeed(base, "urn:isbn:1")).toBe("urn:isbn:1 highlight 10-12");
});

test("is independent of the highlighted text, so tidying it doesn't move the rkey", () => {
  const quoted = highlightSeed({ ...base, exact: '"hello"' }, "urn:isbn:1");
  const tidied = highlightSeed({ ...base, exact: "hello" }, "urn:isbn:1");
  expect(quoted).toBe(tidied);
});

test("a highlight and a note at the same location get different seeds", () => {
  const highlight = highlightSeed({ ...base, kind: "highlight" }, "urn:isbn:1");
  const note = highlightSeed({ ...base, kind: "note", exact: "" }, "urn:isbn:1");
  expect(highlight).not.toBe(note);
});

test("different locations and different books differ", () => {
  expect(highlightSeed(base, "urn:isbn:1")).not.toBe(
    highlightSeed({ ...base, locationStart: 99 }, "urn:isbn:1"),
  );
  expect(highlightSeed(base, "urn:isbn:1")).not.toBe(highlightSeed(base, "urn:isbn:2"));
});

test("falls back to the text when a highlight has no location", () => {
  const a = highlightSeed({ kind: "highlight", bookTitle: "B", exact: "first" }, "urn:isbn:1");
  const b = highlightSeed({ kind: "highlight", bookTitle: "B", exact: "second" }, "urn:isbn:1");
  expect(a).not.toBe(b);
});
