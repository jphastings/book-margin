export type { AnnotationKind, KindleHighlight } from "./types.ts";
export { HOMEPAGE, KINDLE_LOCATION_NS } from "./constants.ts";
export { parseMyClippings } from "./clippings.ts";
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
export { stripWrappingQuotes } from "./text.ts";
export { highlightSeed } from "./identity.ts";
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
