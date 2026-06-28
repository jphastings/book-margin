/** Pure ISBN helpers — validation, normalisation, and ISBN-10 → ISBN-13. */

/** Strip hyphens/spaces and upper-case the trailing check digit. */
export function normalizeIsbn(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

export function isValidIsbn10(raw: string): boolean {
  const isbn = normalizeIsbn(raw);
  if (!/^\d{9}[\dX]$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const char = isbn[i]!;
    const digit = char === "X" ? 10 : Number(char);
    sum += digit * (10 - i);
  }
  return sum % 11 === 0;
}

export function isValidIsbn13(raw: string): boolean {
  const isbn = normalizeIsbn(raw);
  if (!/^\d{13}$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += Number(isbn[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return sum % 10 === 0;
}

export function isbn10To13(raw: string): string | undefined {
  if (!isValidIsbn10(raw)) return undefined;
  const core = `978${normalizeIsbn(raw).slice(0, 9)}`;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(core[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return `${core}${check}`;
}

/** Coerce any valid ISBN-10 or ISBN-13 to a canonical ISBN-13, else undefined. */
export function toIsbn13(raw: string): string | undefined {
  const isbn = normalizeIsbn(raw);
  if (isValidIsbn13(isbn)) return isbn;
  if (isValidIsbn10(isbn)) return isbn10To13(isbn);
  return undefined;
}

/**
 * Whether an Amazon ASIN is actually an ISBN-10. Print books on Amazon are
 * keyed by their ISBN-10; ebooks use a `B0…` code that is never an ISBN.
 */
export function isIsbn10Asin(asin: string): boolean {
  return !/^B/i.test(asin) && isValidIsbn10(asin);
}
