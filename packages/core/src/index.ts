export type { Clipping } from "@byjp/kindle-clippings";
export { HOMEPAGE, KINDLE_LOCATION_NS, PAGE_NS } from "./constants.ts";
export type {
  MarginBody,
  MarginGenerator,
  MarginMotivation,
  MarginNote,
  MarginSelector,
  MarginSelectorType,
  MarginTarget,
} from "./margin.ts";
export { MARGIN_NOTE_COLLECTION } from "./margin.ts";
export { toMarginNote, type MapOptions } from "./mapper.ts";
export { recordsEqual } from "./equal.ts";
export { deterministicTid } from "./tid.ts";
export {
  isbn10To13,
  isIsbn10Asin,
  isValidIsbn10,
  isValidIsbn13,
  normalizeIsbn,
  toIsbn13,
} from "./isbn.ts";
export {
  resolveBook,
  slugifyBook,
  type BookKey,
  type IsbnSource,
  type IsbnStore,
  type ResolvedIsbn,
  type ResolvedIsbnCache,
  type ResolveOptions,
  type ResolveResult,
} from "./resolver.ts";
export {
  syncHighlights,
  type HeldBook,
  type RepoClient,
  type SyncOptions,
  type SyncReport,
} from "./sync.ts";
export {
  planBook,
  planSync,
  type PlannedBook,
  type PlannedEntry,
  type PlanOptions,
} from "./plan.ts";
export { groupByBook, type BookGroup } from "./grouping.ts";
