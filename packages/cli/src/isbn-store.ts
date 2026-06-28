import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { IsbnStore } from "@byjp/kindle-margin-core";

/** Store keys are alphanumeric (ASINs) or slug chars; guard against path escapes. */
const KEY_PATTERN = /^[A-Za-z0-9-]+$/;

/** The default on-disk location for the persistent ASIN → ISBN store. */
export function defaultStoreDir(): string {
  return join(homedir(), ".kindle-margin", "asins");
}

/** The default on-disk location for the persistent title-slug → ISBN store. */
export function defaultTitleStoreDir(): string {
  return join(homedir(), ".kindle-margin", "titles");
}

/**
 * A read-write title-slug → ISBN store: `<dir>/<slug>.txt` containing just the
 * ISBN. Intended for hand-pinning books that carry no ASIN (My Clippings.txt).
 */
export function createFileTitleStore(dir: string = defaultTitleStoreDir()): IsbnStore {
  return createFileStore(dir);
}

/**
 * A filesystem-backed {@link IsbnStore}: one file per ASIN at
 * `<dir>/<asin>.txt` containing just the ISBN (no trailing newline). Files can
 * be created or edited by hand to permanently pin an ASIN to an ISBN.
 */
export function createFileIsbnStore(dir: string = defaultStoreDir()): IsbnStore {
  return createFileStore(dir);
}

/** One file per key at `<dir>/<key>.txt` holding just the ISBN, no trailing newline. */
function createFileStore(dir: string): IsbnStore {
  return {
    async get(key) {
      if (!KEY_PATTERN.test(key)) return undefined;
      try {
        const text = (await readFile(join(dir, `${key}.txt`), "utf8")).trim();
        return text || undefined;
      } catch {
        return undefined;
      }
    },

    async set(key, isbn13) {
      if (!KEY_PATTERN.test(key)) return;
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, `${key}.txt`), isbn13);
    },
  };
}
