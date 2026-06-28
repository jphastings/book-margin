import { expect, test } from "vite-plus/test";
import { isbn10To13, isIsbn10Asin, isValidIsbn10, isValidIsbn13, toIsbn13 } from "../src/isbn.ts";

test("validates ISBN-10 including the X check digit and hyphens", () => {
  expect(isValidIsbn10("0-596-80552-7")).toBe(true);
  expect(isValidIsbn10("080442957X")).toBe(true);
  expect(isValidIsbn10("0596805528")).toBe(false);
});

test("validates ISBN-13", () => {
  expect(isValidIsbn13("978-0-596-80552-4")).toBe(true);
  expect(isValidIsbn13("9780596805523")).toBe(false);
});

test("converts ISBN-10 to ISBN-13 with a recomputed check digit", () => {
  expect(isbn10To13("0596805527")).toBe("9780596805524");
  expect(toIsbn13("0-596-80552-7")).toBe("9780596805524");
  expect(toIsbn13("9780596805524")).toBe("9780596805524");
  expect(toIsbn13("not-an-isbn")).toBeUndefined();
});

test("recognises an ISBN-10 ASIN but not a B0 ebook ASIN", () => {
  expect(isIsbn10Asin("0596805527")).toBe(true);
  expect(isIsbn10Asin("B0046LU7H0")).toBe(false);
});
