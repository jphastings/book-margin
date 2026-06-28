// Matching quote pairs we'll unwrap: straight, and curly (“ ”).
const QUOTE_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['"', '"'],
  ["“", "”"],
];
const ANY_DOUBLE_QUOTE = /["“”]/;

/**
 * Strip a single pair of wrapping double quotes when the whole string is quoted
 * and contains no double quotes of its own — e.g. Kindle often captures a quoted
 * passage with its surrounding quote marks. `"hello"` → `hello`, but
 * `"he said "hi""` and `partly "quoted"` are left untouched.
 */
export function stripWrappingQuotes(text: string): string {
  if (text.length < 2) return text;
  for (const [open, close] of QUOTE_PAIRS) {
    if (text.startsWith(open) && text.endsWith(close)) {
      const inner = text.slice(open.length, text.length - close.length);
      if (!ANY_DOUBLE_QUOTE.test(inner)) return inner;
    }
  }
  return text;
}
