import { parseDate } from "./date.ts";
import { ADDED_ON, TYPE_WORDS } from "./locales.ts";
import type { ClippingKind, Location } from "./types.ts";

/** An entry as read from one block, before note-revision collapse and pairing. */
export interface ParsedEntry {
  kind: ClippingKind;
  title: string;
  author?: string;
  page?: string;
  location?: Location;
  addedAt?: string;
  /** The block body — highlighted passage (highlight) or note text (note). */
  body: string;
}

const NUMBER_GROUP = /(\d+)(?:\s*[-–—]\s*(\d+))?/g;

/**
 * Parse one `My Clippings.txt` block (title line, metadata line, blank, body).
 * Returns undefined for bookmarks and for blocks whose type word we don't
 * recognise (unknown locale), which are skipped rather than misclassified.
 */
export function parseBlock(rawBlock: string): ParsedEntry | undefined {
  const lines = rawBlock.split(/\r?\n/);
  const titleLine = lines[0]?.trim();
  const metaLine = lines[1]?.trim();
  if (!titleLine || !metaLine) return undefined;

  const kind = detectKind(metaLine);
  if (!kind) return undefined;

  const { title, author } = parseTitleAndAuthor(titleLine);
  const body = lines.slice(2).join("\n").trim();

  const { beforeDate, dateText } = splitOnAddedOn(metaLine);
  const { location, page } = extractLocationAndPage(beforeDate);

  const entry: ParsedEntry = { kind, title, body };
  if (author) entry.author = author;
  if (location) entry.location = location;
  if (page !== undefined) entry.page = page;
  const addedAt = dateText ? parseDate(dateText) : undefined;
  if (addedAt) entry.addedAt = addedAt;
  return entry;
}

function detectKind(metaLine: string): ClippingKind | undefined {
  const lower = metaLine.toLowerCase();
  for (const { word, kind } of TYPE_WORDS) {
    if (lower.includes(word)) return kind === "bookmark" ? undefined : kind;
  }
  return undefined;
}

/** Split the metadata line at the localized "Added on" phrase. */
function splitOnAddedOn(metaLine: string): { beforeDate: string; dateText?: string } {
  const lower = metaLine.toLowerCase();
  for (const phrase of ADDED_ON) {
    const at = lower.indexOf(phrase);
    if (at >= 0) {
      return {
        beforeDate: metaLine.slice(0, at),
        dateText: metaLine.slice(at + phrase.length).trim(),
      };
    }
  }
  return { beforeDate: metaLine };
}

/**
 * Pull the location range and (optional) page from the pre-date text. Digits are
 * language-independent: a hyphenated group is the location and any standalone
 * number before it is the page; with only single numbers, the first is the page
 * and the last is the location.
 */
function extractLocationAndPage(text: string): { location?: Location; page?: string } {
  const groups: Location[] = [];
  for (const match of text.matchAll(NUMBER_GROUP)) {
    groups.push({ start: Number(match[1]), ...(match[2] ? { end: Number(match[2]) } : {}) });
  }
  if (groups.length === 0) return {};

  const rangeIndex = groups.findIndex((g) => g.end !== undefined);
  if (rangeIndex >= 0) {
    const result: { location?: Location; page?: string } = { location: groups[rangeIndex] };
    if (rangeIndex > 0) result.page = String(groups[rangeIndex - 1]!.start);
    return result;
  }
  if (groups.length === 1) return { location: groups[0] };
  return { page: String(groups[0]!.start), location: groups[groups.length - 1] };
}

function parseTitleAndAuthor(titleLine: string): { title: string; author?: string } {
  // Author is the parenthesised suffix; books can lack it. Authors may be
  // "Last, First" or several joined by ";" — we keep the raw inner string.
  const match = /^(.*)\(([^()]*)\)\s*$/.exec(titleLine);
  if (!match) return { title: titleLine };
  return { title: match[1]!.trim(), author: match[2]!.trim() };
}
