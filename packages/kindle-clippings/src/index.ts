import { collapseNoteRevisions, pairNotesWithHighlights } from "./pipeline.ts";
import { type ParsedEntry, parseBlock } from "./tokenizer.ts";
import type { Clipping } from "./types.ts";

const ENTRY_SEPARATOR = /\r?\n=+\r?\n?/;

/**
 * Parse a Kindle `My Clippings.txt` file into normalised {@link Clipping}s:
 * locale-aware block parsing, then collapse of keystroke-autosaved note
 * revisions, then pairing of each note with the highlight it annotates. Each
 * clipping carries a stable `id` (book + location) and a parsed `addedAt`.
 */
export function parseClippings(fileText: string): Clipping[] {
  const withoutBom = fileText.replace(/^﻿/, "");
  const entries: ParsedEntry[] = [];
  for (const block of withoutBom.split(ENTRY_SEPARATOR)) {
    const entry = parseBlock(block);
    if (entry) entries.push(entry);
  }
  return pairNotesWithHighlights(collapseNoteRevisions(entries));
}

export type { Clipping, ClippingKind, Location } from "./types.ts";
export { SUPPORTED_LANGUAGES } from "./locales.ts";
export { stripWrappingQuotes } from "./text.ts";
export { clippingId } from "./id.ts";
