#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { parseClippings } from "@byjp/kindle-clippings";
import {
  HOMEPAGE,
  KINDLE_LOCATION_NS,
  type MarginGenerator,
  slugifyBook,
  type SyncReport,
  syncHighlights,
} from "@byjp/book-margin-core";
import { authenticate } from "./auth.ts";
import {
  createFileIsbnStore,
  createFileTitleStore,
  defaultStoreDir,
  defaultTitleStoreDir,
} from "./isbn-store.ts";
import { createRepoClient } from "./repo.ts";

const USAGE = `book-margin — sync a Kindle My Clippings.txt into your Margin (atproto) notes

Usage:
  book-margin --file <My Clippings.txt> [options]

Options:
  -f, --file <path>         Path to My Clippings.txt (required)
  -i, --identifier <h>      Your atproto handle or DID (for first login)
  -p, --password <pw>       App password (or set KINDLE_MARGIN_APP_PASSWORD)
      --service <url>       PDS URL (default: auto-resolved from your handle)
      --overrides <path>    JSON file mapping ASIN -> ISBN for unresolved books
      --session <path>      Session file (default: ~/.config/book-margin/session.json)
      --dry-run             Resolve and map, but don't write or authenticate
  -h, --help                Show this help
`;

const GENERATOR: MarginGenerator = {
  id: HOMEPAGE,
  name: "Book Margin (CLI)",
  homepage: HOMEPAGE,
};

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      file: { type: "string", short: "f" },
      identifier: { type: "string", short: "i" },
      password: { type: "string", short: "p" },
      service: { type: "string" },
      overrides: { type: "string" },
      session: { type: "string" },
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (values.help || !values.file) {
    process.stdout.write(USAGE);
    process.exitCode = values.help ? 0 : 1;
    return;
  }

  const clippings = parseClippings(await readFile(values.file, "utf8"));
  if (clippings.length === 0) {
    process.stdout.write("No highlights found in that file.\n");
    return;
  }

  const overrides = values.overrides ? await readOverrides(values.overrides) : undefined;
  const dryRun = values["dry-run"];

  const client = dryRun
    ? undefined
    : await connect({
        service: values.service,
        identifier: values.identifier,
        password: values.password ?? process.env.KINDLE_MARGIN_APP_PASSWORD,
        sessionPath: values.session ?? defaultSessionPath(),
      });

  const report = await syncHighlights(clippings, client, {
    conformsTo: KINDLE_LOCATION_NS,
    importedAt: new Date().toISOString(),
    generator: GENERATOR,
    dryRun,
    resolve: {
      userAgent: `book-margin/0.0 (${HOMEPAGE})`,
      store: createFileIsbnStore(),
      titleStore: createFileTitleStore(),
      ...(overrides ? { overrides } : {}),
    },
  });

  printReport(report, clippings.length, dryRun);
}

async function connect(options: Parameters<typeof authenticate>[0]) {
  const { rpc, did } = await authenticate(options);
  return createRepoClient(rpc, did);
}

async function readOverrides(path: string): Promise<Record<string, string>> {
  return JSON.parse(await readFile(path, "utf8")) as Record<string, string>;
}

function defaultSessionPath(): string {
  const base = process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
  return join(base, "book-margin", "session.json");
}

function printReport(report: SyncReport, total: number, dryRun: boolean): void {
  const verb = dryRun ? "would write" : "wrote";
  const lines = [
    `Parsed ${total} annotation(s) across the file.`,
    `Resolved ${report.resolvedBooks} book(s) to an ISBN.`,
    `${verb[0]!.toUpperCase()}${verb.slice(1)} ${report.written.length} record(s) (idempotent upsert); collapsed ${report.skippedDuplicate} in-file duplicate(s).`,
  ];

  if (report.held.length > 0) {
    lines.push("", `Held back ${report.held.length} book(s) with no confident ISBN match.`);
    lines.push("Pin an ISBN by creating the file shown (it survives future runs):");
    for (const { book, count } of report.held) {
      const author = book.author ? ` — ${book.author}` : "";
      const file = book.asin
        ? join(defaultStoreDir(), `${book.asin}.txt`)
        : join(defaultTitleStoreDir(), `${slugifyBook(book)}.txt`);
      lines.push(`  • ${book.title}${author} (${count} annotation(s))`);
      lines.push(`      echo -n <ISBN> > ${file}`);
    }
  }

  process.stdout.write(`${lines.join("\n")}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
