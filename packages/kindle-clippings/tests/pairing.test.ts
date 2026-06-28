import { expect, test } from "vite-plus/test";
import { parseClippings } from "../src/index.ts";

const SEP = "==========";

function block(
  kind: string,
  location: string,
  body: string,
  at = "Monday, 30 December 2024 14:46:33",
): string {
  return `The Ministry of Time (Bradley, Kaliane)\n- Your ${kind} on page 203 | location ${location} | Added on ${at}\n\n${body}`;
}

test("merges a note at the highlight's end into one commenting clipping", () => {
  const file = [
    block("Highlight", "2984-2985", "the passage"),
    block("Note", "2985", "my comment"),
  ].join(`\n${SEP}\n`);
  const clips = parseClippings(file);

  expect(clips).toHaveLength(1);
  expect(clips[0]).toMatchObject({ kind: "highlight", text: "the passage", note: "my comment" });
});

test("merges a note whose location is strictly inside the range", () => {
  const file = [block("Highlight", "100-110", "passage"), block("Note", "105", "comment")].join(
    `\n${SEP}\n`,
  );
  expect(parseClippings(file)[0]).toMatchObject({ kind: "highlight", note: "comment" });
});

test("keeps a note that matches no highlight as a standalone clipping", () => {
  const file = [
    block("Highlight", "100-110", "passage"),
    block("Note", "500", "orphan thought"),
  ].join(`\n${SEP}\n`);
  const clips = parseClippings(file);

  expect(clips).toHaveLength(2);
  expect(clips.find((c) => c.kind === "note")).toMatchObject({ text: "", note: "orphan thought" });
});

test("pairs by location even when the note block precedes its highlight", () => {
  const file = [block("Note", "2985", "comment"), block("Highlight", "2984-2985", "passage")].join(
    `\n${SEP}\n`,
  );
  const clips = parseClippings(file);

  expect(clips).toHaveLength(1);
  expect(clips[0]).toMatchObject({ kind: "highlight", note: "comment" });
});

test("joins multiple notes on one highlight", () => {
  const file = [
    block("Highlight", "100-110", "passage"),
    block("Note", "105", "first", "Monday, 30 December 2024 14:46:33"),
    block("Note", "108", "second", "Monday, 30 December 2024 14:47:33"),
  ].join(`\n${SEP}\n`);

  expect(parseClippings(file)[0]!.note).toBe("first\n\nsecond");
});
