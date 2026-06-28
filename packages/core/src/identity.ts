import type { KindleHighlight } from "./types.ts";

const FIELD_SEPARATOR = " ";

/**
 * A stable identity string for an annotation, used as the seed for its
 * deterministic rkey: the resolved book (`source`), the kind (highlight vs note,
 * which lets a highlight and a note share a location without colliding), and the
 * Kindle location.
 *
 * It deliberately keys on the location rather than the highlighted text, so
 * editing or tidying the text — fixing the selection, stripping wrapping quotes —
 * does NOT move the rkey. A re-sync overwrites the same record in place instead
 * of orphaning it. (When a highlight has no location at all — rare — the raw text
 * stands in so the seed stays unique.)
 */
export function highlightSeed(highlight: KindleHighlight, source: string): string {
  const location =
    highlight.locationStart !== undefined
      ? `${highlight.locationStart}-${highlight.locationEnd ?? ""}`
      : highlight.exact;
  return [source, highlight.kind, location].join(FIELD_SEPARATOR);
}
