/** A Kindle location, a byte-ish offset into the book. Highlights span a range. */
export interface Location {
  start: number;
  end?: number;
}

export type ClippingKind = "highlight" | "note";

/**
 * A single normalised Kindle annotation. A note that annotates a highlight is
 * merged into that highlight (`kind: "highlight"` with `note` set); a note with
 * no matching highlight stands alone (`kind: "note"`, empty `text`).
 */
export interface Clipping {
  /**
   * A stable identity hash of `title + author + location`, independent of the
   * text. Suitable as a deterministic record key; tidying the text never moves it.
   */
  id: string;
  kind: ClippingKind;
  title: string;
  author?: string;
  /**
   * The print page, when known: a single page label (e.g. `"52"`, or non-numeric
   * like `"xi"`), or a `[start, end]` span when the source records a page range.
   */
  page?: string | [string, string];
  location?: Location;
  /** The highlighted passage (wrapping quotes stripped). Empty for a standalone note. */
  text: string;
  /** A reader's note: the comment on a highlight, or a standalone note's body. */
  note?: string;
  /** ISO 8601 timestamp of when the annotation was made, when parseable. */
  addedAt?: string;
}
