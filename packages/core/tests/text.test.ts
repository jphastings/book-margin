import { expect, test } from "vite-plus/test";
import { stripWrappingQuotes } from "../src/text.ts";

test("strips a wrapping pair of straight double quotes", () => {
  expect(stripWrappingQuotes('"hello world"')).toBe("hello world");
});

test("strips a wrapping pair of curly double quotes", () => {
  expect(stripWrappingQuotes("“hello world”")).toBe("hello world");
});

test("leaves text with internal double quotes untouched", () => {
  expect(stripWrappingQuotes('"he said "hi" to me"')).toBe('"he said "hi" to me"');
  expect(stripWrappingQuotes("“a “nested” quote”")).toBe("“a “nested” quote”");
});

test("leaves unquoted or partly-quoted text untouched", () => {
  expect(stripWrappingQuotes("hello world")).toBe("hello world");
  expect(stripWrappingQuotes('partly "quoted"')).toBe('partly "quoted"');
  expect(stripWrappingQuotes('"mismatched”')).toBe('"mismatched”');
});

test("handles short and empty strings", () => {
  expect(stripWrappingQuotes('""')).toBe("");
  expect(stripWrappingQuotes('"')).toBe('"');
  expect(stripWrappingQuotes("")).toBe("");
});
