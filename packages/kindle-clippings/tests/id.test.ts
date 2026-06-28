import { expect, test } from "vite-plus/test";
import { clippingId } from "../src/id.ts";

const base = { title: "A Book", author: "An Author", location: { start: 10, end: 12 } };

test("id is stable and ignores the highlighted text", () => {
  expect(clippingId(base)).toBe(clippingId({ ...base, fallbackText: "anything" }));
});

test("id differs by location, book and author", () => {
  expect(clippingId(base)).not.toBe(clippingId({ ...base, location: { start: 99 } }));
  expect(clippingId(base)).not.toBe(clippingId({ ...base, title: "Other" }));
  expect(clippingId(base)).not.toBe(clippingId({ ...base, author: "Someone Else" }));
});

test("location-less clippings stay distinct via their text", () => {
  const a = { title: "A Book", author: "An Author", fallbackText: "first" };
  const b = { title: "A Book", author: "An Author", fallbackText: "second" };
  expect(clippingId(a)).not.toBe(clippingId(b));
});
