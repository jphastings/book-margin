import { expect, test } from "vite-plus/test";
import { recordsEqual } from "../src/equal.ts";

test("equal regardless of key order", () => {
  expect(recordsEqual({ a: 1, b: { c: 2, d: 3 } }, { b: { d: 3, c: 2 }, a: 1 })).toBe(true);
});

test("ignores explicit undefined (matches an omitted key)", () => {
  expect(recordsEqual({ a: 1, b: undefined }, { a: 1 })).toBe(true);
});

test("detects a changed value (a record that needs updating)", () => {
  const planned = { motivation: "highlighting", target: { selector: { exact: "new text" } } };
  const stored = { motivation: "highlighting", target: { selector: { exact: "old text" } } };
  expect(recordsEqual(planned, stored)).toBe(false);
});

test("arrays compare element-wise and order-sensitively", () => {
  expect(recordsEqual({ tags: ["a", "b"] }, { tags: ["a", "b"] })).toBe(true);
  expect(recordsEqual({ tags: ["a", "b"] }, { tags: ["b", "a"] })).toBe(false);
});

test("ignoreKeys drops named top-level fields before comparing", () => {
  const a = { text: "hi", createdAt: "2026-06-28T00:00:00.000Z" };
  const b = { text: "hi", createdAt: "2024-01-01T00:00:00.000Z" };
  expect(recordsEqual(a, b)).toBe(false);
  expect(recordsEqual(a, b, ["createdAt"])).toBe(true);
});
