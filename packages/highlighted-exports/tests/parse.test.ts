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
    page: "12",
    text: "People who believe in the immortality of the soul do not need to accumulate power, build empires or prepare lasting defences.",
    note: "This feels a little trite, but it's interesting that it even fits.",
  });

  // A page range becomes a [start, end] span; a note-less highlight has no note.
  expect(clippings[1]!.page).toEqual(["18", "19"]);
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

test("joins a multi-line quote (only the first line is quoted)", () => {
  const md = `# Highlights for Time
### Author
ISBN: 9780000000001


> […] back in 1848, John Stuart Mill wondered how much time labour
saving devices actually saved, once
the maintenance is taken into
account: "It is questionable," he wrote, "if all the mechanical inventions yet made have lightened the day's toil of any human being.”
p. 146
Tags: Calm, Tech

**Created with [Highlighted](https://highlighted.app)**.`;
  const [clip] = parseHighlightedExport(md).clippings;
  expect(clip!.text).toBe(
    `[…] back in 1848, John Stuart Mill wondered how much time labour saving devices actually saved, once the maintenance is taken into account: "It is questionable," he wrote, "if all the mechanical inventions yet made have lightened the day's toil of any human being.”`,
  );
  expect(clip!.page).toBe("146");
});

test("a blank line inside a quote becomes a paragraph break", () => {
  const md = `# Highlights for X
ISBN: 9780000000002


> First paragraph, line one
line two.

Second paragraph.
p. 3

**Created with [Highlighted](https://highlighted.app)**.`;
  const [clip] = parseHighlightedExport(md).clippings;
  expect(clip!.text).toBe("First paragraph, line one line two.\nSecond paragraph.");
  expect(clip!.page).toBe("3");
});
