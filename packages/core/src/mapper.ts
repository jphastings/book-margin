import type { Clipping } from "@byjp/kindle-clippings";
import type { MarginGenerator, MarginNote, MarginSelector } from "./margin.ts";

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
 * Map a {@link Clipping} to an `at.margin.note` record.
 *
 * The highlighted text becomes a portable `TextQuoteSelector`; the proprietary
 * Kindle location/page rides along in a `refinedBy` `FragmentSelector` under the
 * `conformsTo` URI. A note carried on a highlight makes the record a `commenting`
 * annotation; a standalone note (no highlighted text) targets the FragmentSelector
 * directly.
 */
export function toMarginNote(clipping: Clipping, options: MapOptions): MarginNote {
  const fragment = buildFragmentSelector(clipping, options.conformsTo);

  const note: MarginNote = {
    $type: "at.margin.note",
    motivation: clipping.note ? "commenting" : "highlighting",
    target: {
      source: options.source,
      ...(clipping.title ? { title: clipping.title } : {}),
    },
    createdAt: clipping.addedAt ?? options.importedAt,
  };

  if (clipping.note) note.body = { value: clipping.note, format: "text/plain" };
  if (options.generator) note.generator = options.generator;

  const selector = buildSelector(clipping.text, fragment);
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

function buildFragmentSelector(clipping: Clipping, conformsTo: string): MarginSelector | undefined {
  const value = fragmentValue(clipping);
  if (!value) return undefined;
  return { type: "FragmentSelector", conformsTo, value };
}

/** Build the Kindle-location fragment value, e.g. `location=792-794&page=52`. */
function fragmentValue(clipping: Clipping): string | undefined {
  const params = new URLSearchParams();
  if (clipping.location) {
    const { start, end } = clipping.location;
    params.set("location", end !== undefined ? `${start}-${end}` : `${start}`);
  }
  if (clipping.page !== undefined) params.set("page", String(clipping.page));
  const value = params.toString();
  return value.length > 0 ? value : undefined;
}
