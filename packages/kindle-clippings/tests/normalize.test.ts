import { expect, test } from "vite-plus/test";
import { parseClippings } from "../src/index.ts";

const SEP = "==========";

function note(text: string, at: string): string {
  return `Book (Author)\n- Your Note on page 7 | location 114 | Added on Monday, 30 December 2024 ${at}\n\n${text}`;
}

test("collapses keystroke-autosaved note revisions to the final one", () => {
  const file = [
    note("this", "14:22:03"),
    note("this is the", "14:22:06"),
    note("this is the whole note", "14:22:12"),
  ].join(`\n${SEP}\n`);
  const clips = parseClippings(file);

  expect(clips).toHaveLength(1);
  expect(clips[0]).toMatchObject({ kind: "note", note: "this is the whole note" });
});

test("strips wrapping double quotes from highlighted text but keeps the id stable", () => {
  const quoted = `Book (Author)\n- Your Highlight on page 1 | location 10-12 | Added on Monday, 30 December 2024 14:46:33\n\n"a quoted passage"\n${SEP}`;
  const plain = quoted.replace('"a quoted passage"', "a quoted passage");

  const [q] = parseClippings(quoted);
  const [p] = parseClippings(plain);

  expect(q!.text).toBe("a quoted passage");
  expect(q!.id).toBe(p!.id);
});
