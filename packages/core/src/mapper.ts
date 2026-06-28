import type { MarginGenerator, MarginNote, MarginSelector } from "./margin.ts";
import { stripWrappingQuotes } from "./text.ts";
import type { KindleHighlight } from "./types.ts";

export interface MapOptions {
  /** Resolved book identity URI for `target.source`, e.g. `urn:isbn:9780135957059`. */
  source: string;
  /** URI the Kindle-location FragmentSelector conforms to. */
  conformsTo: string;
  /** Identifies this tool as the creator of the record. */
  generator?: MarginGenerator;
  /** Fallback `createdAt` when the annotation itself carries no timestamp. */
  importedAt: string;
}

/**
 * Map a normalised {@link KindleHighlight} to an `at.margin.note` record.
 *
 * The highlighted text becomes a portable `TextQuoteSelector`; the proprietary
 * Kindle location/page/ASIN ride along in a `refinedBy` `FragmentSelector` under
 * the `conformsTo` URI. A standalone note (no highlighted text) targets the
 * FragmentSelector directly. The ASIN is always retained in the fragment so book
 * identity survives even though `target.source` prefers the ISBN.
 */
export function toMarginNote(highlight: KindleHighlight, options: MapOptions): MarginNote {
  const fragment = buildFragmentSelector(highlight, options.conformsTo);

  const note: MarginNote = {
    $type: "at.margin.note",
    motivation: highlight.note ? "commenting" : "highlighting",
    target: {
      source: options.source,
      ...(highlight.bookTitle ? { title: highlight.bookTitle } : {}),
    },
    createdAt: highlight.createdAt ?? options.importedAt,
  };

  if (highlight.color) note.color = highlight.color;
  if (highlight.note) note.body = { value: highlight.note, format: "text/plain" };
  if (options.generator) note.generator = options.generator;

  const selector = buildSelector(stripWrappingQuotes(highlight.exact), fragment);
  if (selector) note.target.selector = selector;

  return note;
}

function buildSelector(
  exact: string,
  fragment: MarginSelector | undefined,
): MarginSelector | undefined {
  if (exact) {
    const quote: MarginSelector = { type: "TextQuoteSelector", exact };
    if (fragment) quote.refinedBy = fragment;
    return quote;
  }
  return fragment;
}

function buildFragmentSelector(
  highlight: KindleHighlight,
  conformsTo: string,
): MarginSelector | undefined {
  const value = fragmentValue(highlight);
  if (!value) return undefined;
  return { type: "FragmentSelector", conformsTo, value };
}

/** Build the Kindle-location fragment value, e.g. `asin=B0046LU7H0&location=792-794&page=52`. */
function fragmentValue(highlight: KindleHighlight): string | undefined {
  const params = new URLSearchParams();
  if (highlight.asin) params.set("asin", highlight.asin);
  if (highlight.locationStart !== undefined) {
    const end = highlight.locationEnd;
    params.set(
      "location",
      end !== undefined ? `${highlight.locationStart}-${end}` : `${highlight.locationStart}`,
    );
  }
  if (highlight.page !== undefined) params.set("page", String(highlight.page));
  const value = params.toString();
  return value.length > 0 ? value : undefined;
}
