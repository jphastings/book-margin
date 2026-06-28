/** The kind of Kindle annotation an entry represents. */
export type AnnotationKind = "highlight" | "note" | "bookmark";

/**
 * A single Kindle annotation, normalised across every source (My Clippings.txt,
 * the read.amazon.com notebook, app exports). Fields are optional because no
 * source provides all of them — e.g. My Clippings.txt has no ASIN or colour.
 */
export interface KindleHighlight {
  kind: AnnotationKind;
  bookTitle: string;
  author?: string;
  /** Amazon identifier for the book. Present from the notebook, absent from My Clippings.txt. */
  asin?: string;
  /** The highlighted text. Empty for standalone notes and bookmarks. */
  exact: string;
  /** A reader's note attached to (or standing in for) the annotation. */
  note?: string;
  /** Highlight colour tint (e.g. "yellow"). Present from the notebook only. */
  color?: string;
  locationStart?: number;
  locationEnd?: number;
  page?: number;
  /** ISO 8601 timestamp of when the annotation was made, when the source dates it. */
  createdAt?: string;
}
