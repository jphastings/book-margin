/**
 * Whether two records are identical in content, independent of key order — used
 * to tell an annotation that's already saved unchanged from one that needs an
 * update. Compares via a canonical JSON form (sorted keys, `undefined` dropped).
 *
 * `ignoreKeys` drops the named top-level fields from both sides first, e.g.
 * `["createdAt"]` so an undated highlight (whose createdAt is just the import
 * time) doesn't read as changed every time it's re-imported.
 */
export function recordsEqual(a: unknown, b: unknown, ignoreKeys?: readonly string[]): boolean {
  return stableStringify(omit(a, ignoreKeys)) === stableStringify(omit(b, ignoreKeys));
}

function omit(value: unknown, keys?: readonly string[]): unknown {
  if (!keys?.length || value === null || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const copy = { ...(value as Record<string, unknown>) };
  for (const key of keys) delete copy[key];
  return copy;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const object = value as Record<string, unknown>;
  const keys = Object.keys(object)
    .filter((key) => object[key] !== undefined)
    .sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`).join(",")}}`;
}
