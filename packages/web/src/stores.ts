import type { IsbnStore } from "@kindle-margin/core";

/**
 * A {@link IsbnStore} backed by localStorage, so ISBN lookups are cached across
 * visits. `namespace` separates the ASIN-keyed and title-slug-keyed stores.
 */
export function createLocalIsbnStore(namespace: string): IsbnStore {
  const prefix = `kindle-margin:isbn:${namespace}:`;
  return {
    get(key) {
      try {
        return Promise.resolve(localStorage.getItem(prefix + key) ?? undefined);
      } catch {
        return Promise.resolve(undefined);
      }
    },
    set(key, isbn13) {
      try {
        localStorage.setItem(prefix + key, isbn13);
      } catch {
        // Storage unavailable or full — caching is best-effort.
      }
      return Promise.resolve();
    },
  };
}
