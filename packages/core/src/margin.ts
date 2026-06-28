/**
 * TypeScript shapes for the subset of the `at.margin.note` lexicon (revision 4)
 * that this tool reads and writes. Mirrors lexicons/at/margin/note.json.
 */

export const MARGIN_NOTE_COLLECTION = "at.margin.note";

export type MarginMotivation =
  | "commenting"
  | "highlighting"
  | "bookmarking"
  | "tagging"
  | "describing"
  | "linking"
  | "replying"
  | "editing"
  | "questioning"
  | "assessing";

export type MarginSelectorType =
  | "TextQuoteSelector"
  | "TextPositionSelector"
  | "CssSelector"
  | "XPathSelector"
  | "FragmentSelector"
  | "RangeSelector";

export interface MarginSelector {
  type: MarginSelectorType;
  exact?: string;
  prefix?: string;
  suffix?: string;
  start?: number;
  end?: number;
  value?: string;
  conformsTo?: string;
  refinedBy?: MarginSelector;
}

export interface MarginTarget {
  source: string;
  sourceHash?: string;
  title?: string;
  selector?: MarginSelector;
}

export interface MarginBody {
  value?: string;
  format?: string;
  uri?: string;
}

export interface MarginGenerator {
  id?: string;
  name?: string;
  homepage?: string;
}

export interface MarginNote {
  $type: typeof MARGIN_NOTE_COLLECTION;
  motivation: MarginMotivation;
  color?: string;
  body?: MarginBody;
  target: MarginTarget;
  tags?: string[];
  generator?: MarginGenerator;
  createdAt: string;
  modifiedAt?: string;
}
