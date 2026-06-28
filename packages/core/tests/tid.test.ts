import { expect, test } from "vite-plus/test";
import { deterministicTid } from "../src/tid.ts";

const TID = /^[234567abcdefghij][234567abcdefghijklmnopqrstuvwxyz]{12}$/;

test("produces a syntactically valid 13-char TID", async () => {
  expect(await deterministicTid("seed", "2026-06-27T00:00:00.000Z")).toMatch(TID);
});

test("is a pure function of seed and timestamp", async () => {
  const a = await deterministicTid("seed", "2026-06-27T00:00:00.000Z");
  const b = await deterministicTid("seed", "2026-06-27T00:00:00.000Z");
  expect(a).toBe(b);
});

test("different seeds at the same time differ in the clock field", async () => {
  const a = await deterministicTid("one", "2026-06-27T00:00:00.000Z");
  const b = await deterministicTid("two", "2026-06-27T00:00:00.000Z");
  expect(a).not.toBe(b);
});

test("later timestamps sort after earlier ones (lexicographically)", async () => {
  const earlier = await deterministicTid("seed", "2020-01-01T00:00:00.000Z");
  const later = await deterministicTid("seed", "2026-06-27T00:00:00.000Z");
  expect(later > earlier).toBe(true);
});

test("an undated record is stable and seed-dependent", async () => {
  expect(await deterministicTid("seed", "")).toMatch(TID);
  expect(await deterministicTid("one", "")).toBe(await deterministicTid("one", ""));
  // Distinct highlights spread across the sentinel year rather than colliding.
  expect(await deterministicTid("one", "")).not.toBe(await deterministicTid("two", ""));
});

test("undated records sort before any real (post-1970) timestamp", async () => {
  const undated = await deterministicTid("seed", "");
  const dated = await deterministicTid("seed", "2010-01-01T00:00:00.000Z");
  expect(undated < dated).toBe(true);
});
