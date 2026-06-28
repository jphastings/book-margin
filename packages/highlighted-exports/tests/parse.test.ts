import { expect, test } from "vite-plus/test";
import { parseHighlightedExport } from "../src/index.ts";

const EXPORT = `# Highlights for The Celtic Tree Calendar
### Michael Vescoli
ISBN: 9780285634633




> People who believe in the immortality of the soul do not need to accumulate power, build empires or prepare lasting defences.
p. 12
Note: This feels a little trite, but it's interesting that it even fits.
Tags: Human nature


> The Celts failed to provide any written records of their victories.
p. 18-19
Tags: History, Mindfulness


**Created with [Highlighted](https://highlighted.app)**.
*Highlights may be protected by copyright.*`;

test("reads the book's title, author and ISBN from the header", () => {
  const result = parseHighlightedExport(EXPORT);
  expect(result.title).toBe("The Celtic Tree Calendar");
  expect(result.author).toBe("Michael Vescoli");
  expect(result.isbn).toBe("9780285634633");
});

test("turns each blockquote into a highlight with its page and note", () => {
  const { clippings } = parseHighlightedExport(EXPORT);
  expect(clippings).toHaveLength(2);

  expect(clippings[0]).toMatchObject({
    kind: "highlight",
    title: "The Celtic Tree Calendar",
    author: "Michael Vescoli",
    page: 12,
    text: "People who believe in the immortality of the soul do not need to accumulate power, build empires or prepare lasting defences.",
    note: "This feels a little trite, but it's interesting that it even fits.",
  });

  // A page range keeps its starting page; a note-less highlight has no note.
  expect(clippings[1]!.page).toBe(18);
  expect(clippings[1]!.note).toBeUndefined();
});

test("gives each highlight a stable id that is independent of import", () => {
  const a = parseHighlightedExport(EXPORT).clippings;
  const b = parseHighlightedExport(EXPORT).clippings;
  expect(a[0]!.id).toBe(b[0]!.id);
  expect(a[0]!.id).not.toBe(a[1]!.id);
});

test("drops the copyright footer and ignores tags", () => {
  const { clippings } = parseHighlightedExport(EXPORT);
  for (const clip of clippings) {
    expect(clip.text).not.toContain("Created with");
    expect(clip.text).not.toContain("Tags:");
  }
});

test("returns no highlights for content that isn't an export", () => {
  expect(parseHighlightedExport("just some text").clippings).toHaveLength(0);
});
