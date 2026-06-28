import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vite-plus/test";
import { createFileIsbnStore } from "../src/isbn-store.ts";

async function withTempDir(run: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "km-store-"));
  try {
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("stores and reads back an ISBN with no trailing newline", async () => {
  await withTempDir(async (dir) => {
    const store = createFileIsbnStore(dir);
    await store.set("B0046LU7H0", "9780135957059");

    expect(await store.get("B0046LU7H0")).toBe("9780135957059");
    expect(await readFile(join(dir, "B0046LU7H0.txt"), "utf8")).toBe("9780135957059");
  });
});

test("ignores keys that could escape the directory", async () => {
  await withTempDir(async (dir) => {
    const store = createFileIsbnStore(dir);
    await store.set("../evil", "9780135957059");
    expect(await store.get("../evil")).toBeUndefined();
  });
});

test("returns undefined for an unknown key", async () => {
  await withTempDir(async (dir) => {
    expect(await createFileIsbnStore(dir).get("B0NOTHERE0")).toBeUndefined();
  });
});
