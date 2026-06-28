import { expect, test } from "vite-plus/test";
import { parseMyClippings } from "../src/clippings.ts";

const SEP = "==========";

test("parses a highlight with page, location range, author and date", () => {
  const file = [
    "﻿The Pragmatic Programmer (Andrew Hunt;David Thomas)",
    "- Your Highlight on page 12 | location 145-146 | Added on Sunday, 5 January 2020 14:23:01",
    "",
    "Care about your craft.",
    SEP,
    "",
  ].join("\n");

  const [highlight] = parseMyClippings(file);

  expect(highlight).toMatchObject({
    kind: "highlight",
    bookTitle: "The Pragmatic Programmer",
    author: "Andrew Hunt;David Thomas",
    exact: "Care about your craft.",
    page: 12,
    locationStart: 145,
    locationEnd: 146,
  });
  expect(highlight!.createdAt).toBe(new Date("2020-01-05T14:23:01").toISOString());
});

test("parses a location-only highlight (no page) with a single location", () => {
  const file = [
    "Some Book",
    "- Your Highlight Location 99 | Added on Mon, 1 Jan 2024 09:00:00",
    "",
    "A single-location highlight.",
    SEP,
  ].join("\n");

  const [highlight] = parseMyClippings(file);

  expect(highlight).toMatchObject({
    kind: "highlight",
    bookTitle: "Some Book",
    exact: "A single-location highlight.",
    locationStart: 99,
  });
  expect(highlight!.author).toBeUndefined();
  expect(highlight!.page).toBeUndefined();
  expect(highlight!.locationEnd).toBeUndefined();
});

test("captures a standalone note as note text, not highlighted text", () => {
  const file = [
    "Some Book (Author)",
    "- Your Note on page 3 | location 40 | Added on Mon, 1 Jan 2024 09:00:00",
    "",
    "This is my marginal note.",
    SEP,
  ].join("\n");

  const [note] = parseMyClippings(file);

  expect(note).toMatchObject({ kind: "note", note: "This is my marginal note.", exact: "" });
});

test("collapses keystroke-autosaved note revisions to the final complete note", () => {
  const revision = (text: string, at: string) =>
    [
      "Some Book (Author)",
      `- Your Note on page 7 | Location 114 | Added on Wednesday, 8 April 2026 ${at}`,
      "",
      text,
      SEP,
    ].join("\n");
  const file = [
    revision("this", "21:22:03"),
    revision("this is the", "21:22:06"),
    revision("this is the second place", "21:22:12"),
  ].join("\n");

  const notes = parseMyClippings(file);

  expect(notes).toHaveLength(1);
  expect(notes[0]).toMatchObject({ kind: "note", note: "this is the second place" });
});

test("keeps notes at different locations as distinct", () => {
  const file = [
    "Some Book\n- Your Note on page 1 | Location 10 | Added on Mon, 1 Jan 2024 09:00:00\n\nfirst note",
    "Some Book\n- Your Note on page 2 | Location 20 | Added on Mon, 1 Jan 2024 09:01:00\n\nsecond note",
    "",
  ].join(`\n${SEP}\n`);

  expect(parseMyClippings(file)).toHaveLength(2);
});

test("skips bookmarks and trailing empty blocks", () => {
  const file = [
    "Some Book",
    "- Your Bookmark on page 5 | location 60 | Added on Mon, 1 Jan 2024 09:00:00",
    "",
    SEP,
    "",
  ].join("\n");

  expect(parseMyClippings(file)).toHaveLength(0);
});

test("preserves multi-line highlight bodies", () => {
  const file = [
    "Some Book",
    "- Your Highlight on page 1 | location 1-2 | Added on Mon, 1 Jan 2024 09:00:00",
    "",
    "Line one.",
    "Line two.",
    SEP,
  ].join("\n");

  expect(parseMyClippings(file)[0]!.exact).toBe("Line one.\nLine two.");
});

test("handles CRLF line endings", () => {
  const file = [
    "Some Book",
    "- Your Highlight on page 1 | location 1-2 | Added on Mon, 1 Jan 2024 09:00:00",
    "",
    "Windows-exported highlight.",
    SEP,
  ].join("\r\n");

  expect(parseMyClippings(file)[0]).toMatchObject({ exact: "Windows-exported highlight." });
});
