/** One rendered line of a record's YAML-style view. */
export interface YamlLine {
  indent: number;
  /** Object key, or null for an array item. */
  key: string | null;
  /** Scalar value, or null for a key that introduces a nested block. */
  value: string | null;
  /** True for an array item ("- value"). */
  bullet: boolean;
}

const scalar = (value: unknown): string => (typeof value === "string" ? value : String(value));

/**
 * Render a value as YAML-ish lines — keys sorted (matching the record
 * comparison), no braces or quotes — for a friendly read-only display.
 */
export function toYamlLines(value: unknown, indent = 0): YamlLine[] {
  if (value === null || typeof value !== "object") {
    return [{ indent, key: null, value: scalar(value), bullet: false }];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) =>
      item !== null && typeof item === "object"
        ? [{ indent, key: null, value: null, bullet: true }, ...toYamlLines(item, indent + 1)]
        : [{ indent, key: null, value: scalar(item), bullet: true }],
    );
  }
  const object = value as Record<string, unknown>;
  const lines: YamlLine[] = [];
  for (const key of Object.keys(object).sort()) {
    const child = object[key];
    if (child === undefined) continue;
    if (child !== null && typeof child === "object") {
      lines.push({ indent, key, value: null, bullet: false });
      lines.push(...toYamlLines(child, indent + 1));
    } else {
      lines.push({ indent, key, value: scalar(child), bullet: false });
    }
  }
  return lines;
}

function lineText(line: YamlLine): string {
  const pad = "  ".repeat(line.indent);
  if (line.bullet) return `${pad}- ${line.value ?? ""}`;
  return line.value === null ? `${pad}${line.key}:` : `${pad}${line.key}: ${line.value}`;
}

export type DiffKind = "same" | "add" | "del";

export interface DiffLine {
  line: YamlLine;
  kind: DiffKind;
}

/**
 * A line-level diff of two values' YAML views via LCS: unchanged lines stay,
 * removed lines (from `oldValue`) are `del`, added lines (from `newValue`) `add`.
 */
export function diffYaml(oldValue: unknown, newValue: unknown): DiffLine[] {
  const before = toYamlLines(oldValue);
  const after = toYamlLines(newValue);
  const a = before.map(lineText);
  const b = after.map(lineText);
  const n = a.length;
  const m = b.length;

  const lcs: number[][] = Array.from({ length: n + 1 }, () =>
    Array.from({ length: m + 1 }, () => 0),
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i]![j] =
        a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ line: after[j]!, kind: "same" });
      i++;
      j++;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      out.push({ line: before[i]!, kind: "del" });
      i++;
    } else {
      out.push({ line: after[j]!, kind: "add" });
      j++;
    }
  }
  while (i < n) out.push({ line: before[i++]!, kind: "del" });
  while (j < m) out.push({ line: after[j++]!, kind: "add" });
  return out;
}
