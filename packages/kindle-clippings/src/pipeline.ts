import { clippingId } from "./id.ts";
import { stripWrappingQuotes } from "./text.ts";
import type { ParsedEntry } from "./tokenizer.ts";
import type { Clipping } from "./types.ts";

/**
 * Kindle autosaves a note while you type it, appending a new entry every few
 * keystrokes ("this" → "this is" → …). They share a book and location, so keep
 * only the last (complete) revision.
 */
export function collapseNoteRevisions(entries: ParsedEntry[]): ParsedEntry[] {
  const lastIndex = new Map<string, number>();
  entries.forEach((entry, index) => {
    if (entry.kind === "note") lastIndex.set(bookLocationKey(entry), index);
  });
  return entries.filter(
    (entry, index) => entry.kind !== "note" || lastIndex.get(bookLocationKey(entry)) === index,
  );
}

/**
 * Merge a note into the highlight it annotates — the note's location falls inside
 * the highlight's range — producing one clipping. Unmatched notes are kept as
 * standalone clippings; uncommented highlights are unchanged.
 */
export function pairNotesWithHighlights(entries: ParsedEntry[]): Clipping[] {
  const attachedNotes = new Map<number, string[]>();
  const pairedNotes = new Set<number>();

  entries.forEach((note, index) => {
    if (note.kind !== "note" || note.location === undefined) return;
    const highlight = bestHighlightFor(entries, note);
    if (highlight < 0) return;
    const notes = attachedNotes.get(highlight) ?? [];
    notes.push(note.body);
    attachedNotes.set(highlight, notes);
    pairedNotes.add(index);
  });

  const clippings: Clipping[] = [];
  entries.forEach((entry, index) => {
    if (entry.kind === "highlight") {
      clippings.push(
        toClipping(entry, stripWrappingQuotes(entry.body), attachedNotes.get(index)?.join("\n\n")),
      );
    } else if (entry.kind === "note" && !pairedNotes.has(index)) {
      clippings.push(toClipping(entry, "", entry.body));
    }
  });
  return clippings;
}

/** The highlight (by index) whose range contains the note, preferring an end match then the tightest range. */
function bestHighlightFor(entries: ParsedEntry[], note: ParsedEntry): number {
  const point = note.location!.start;
  let best = -1;
  let bestScore = Number.POSITIVE_INFINITY;
  entries.forEach((candidate, index) => {
    if (candidate.kind !== "highlight" || !candidate.location || !sameBook(candidate, note)) return;
    const start = candidate.location.start;
    const end = candidate.location.end ?? start;
    if (point < start || point > end) return;
    const score = (end === point ? 0 : 1) * 1e9 + (end - start);
    if (score < bestScore) {
      best = index;
      bestScore = score;
    }
  });
  return best;
}

function toClipping(entry: ParsedEntry, text: string, note: string | undefined): Clipping {
  const clipping: Clipping = {
    id: clippingId({
      title: entry.title,
      ...(entry.author ? { author: entry.author } : {}),
      ...(entry.location ? { location: entry.location } : {}),
      fallbackText: text || note || "",
    }),
    kind: entry.kind,
    title: entry.title,
    text,
  };
  if (entry.author) clipping.author = entry.author;
  if (entry.page !== undefined) clipping.page = entry.page;
  if (entry.location) clipping.location = entry.location;
  if (note) clipping.note = note;
  if (entry.addedAt) clipping.addedAt = entry.addedAt;
  return clipping;
}

function sameBook(a: ParsedEntry, b: ParsedEntry): boolean {
  return a.title === b.title && (a.author ?? "") === (b.author ?? "");
}

function bookLocationKey(entry: ParsedEntry): string {
  const location = `${entry.location?.start ?? ""}-${entry.location?.end ?? ""}`;
  return `${entry.title} ${entry.author ?? ""} ${location}`;
}
