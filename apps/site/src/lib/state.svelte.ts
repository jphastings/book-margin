import {
  type Clipping,
  HOMEPAGE,
  KINDLE_LOCATION_NS,
  type MarginGenerator,
  type MarginNote,
  PHYSICAL_BOOK_NS,
  planBook,
  type PlannedBook,
  type PlannedEntry,
  planSync,
  recordsEqual,
  slugifyBook,
  toIsbn13,
} from "@byjp/book-margin-core";
import { parseHighlightedExport } from "@byjp/highlighted-exports";
import { parseClippings } from "@byjp/kindle-clippings";
import {
  type Authed,
  beginLogin,
  createLocalIsbnStore,
  createRepoClient,
  listExistingNotes,
  restoreSession,
  signOut,
} from "@byjp/book-margin-web";
import { version as APP_VERSION } from "../../package.json";
import { DID_KEY } from "./config.ts";

const PLAN_KEY = "book-margin:plan";

/** Human name of each import source, keyed by the locator namespace it uses. */
const SOURCE_NAMES: Record<string, string> = {
  [KINDLE_LOCATION_NS]: "Kindle Clippings",
  [PHYSICAL_BOOK_NS]: "Highlighted Export",
};

/** Record generator: this tool (name + version) and the source it imported from. */
function generatorFor(conformsTo: string): MarginGenerator {
  const source = SOURCE_NAMES[conformsTo];
  return {
    id: HOMEPAGE,
    name: `Book Margin ${APP_VERSION}${source ? ` (${source})` : ""}`,
    homepage: HOMEPAGE,
  };
}

export type View = "landing" | "analyzing" | "review";
export type RowStatus = "fresh" | "update" | "present" | "missing-isbn";

/** Display order for statuses: red (needs attention) first, green (done) last. */
export const STATUS_RANK: Record<RowStatus, number> = {
  "missing-isbn": 0,
  fresh: 1,
  update: 2,
  present: 3,
};

interface StoredPlan {
  importedAt: string;
  plan: PlannedBook[];
}

function stores() {
  return { store: createLocalIsbnStore("asin"), titleStore: createLocalIsbnStore("title") };
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Tell a Highlighted.app Markdown export from a Kindle My Clippings.txt by content. */
function isHighlightedExport(text: string): boolean {
  return /^#\s+Highlights for\s/m.test(text) || text.includes("highlighted.app");
}

class AppState {
  view = $state<View>("landing");
  plan = $state<PlannedBook[]>([]);
  importedAt = $state("");
  did = $state<string | undefined>(undefined);
  handle = $state<string | undefined>(undefined);
  agent = $state<Authed["agent"] | undefined>(undefined);
  existing = $state<Map<string, MarginNote>>(new Map());
  /** Records the user has toggled off; excluded from the save. */
  excluded = $state<Set<PlannedEntry>>(new Set());
  /** The one record whose status description is pinned open (only one at a time). */
  openTip = $state<PlannedEntry | undefined>(undefined);
  /** The record being inspected (option-click) in the JSON/diff dialog. */
  inspecting = $state<PlannedEntry | undefined>(undefined);
  error = $state("");
  saving = $state(false);
  savedCount = $state(0);
  savingTotal = $state(0);

  get loggedIn(): boolean {
    return this.agent !== undefined;
  }

  get resolvedBooks(): number {
    return this.plan.filter((book) => book.isbn13).length;
  }

  get totalRecords(): number {
    return this.plan.reduce((n, book) => n + (book.isbn13 ? book.entries.length : 0), 0);
  }

  get missingBooks(): number {
    return this.plan.filter((book) => !book.isbn13).length;
  }

  /** How many records will actually be written: fresh or update, and not toggled off. */
  get pendingCount(): number {
    let n = 0;
    for (const book of this.plan) {
      if (!book.isbn13) continue;
      for (const entry of book.entries) {
        if (this.excluded.has(entry)) continue;
        const status = this.statusFor(book, entry);
        if (status === "fresh" || status === "update") n++;
      }
    }
    return n;
  }

  statusFor(book: PlannedBook, entry: PlannedEntry): RowStatus {
    if (!book.isbn13 || !entry.rkey) return "missing-isbn";
    // Signed out, we can't know what's on the server — everything is a fresh upload.
    if (!this.agent) return "fresh";
    const stored = this.existing.get(entry.rkey);
    if (!stored) return "fresh";
    // An undated highlight re-imports with a fresh createdAt (the import time),
    // so ignore createdAt when comparing — otherwise it would always look changed.
    const ignore = entry.clipping.addedAt ? undefined : ["createdAt"];
    return recordsEqual(entry.note, stored, ignore) ? "present" : "update";
  }

  isExcluded(entry: PlannedEntry): boolean {
    return this.excluded.has(entry);
  }

  toggleExcluded(entry: PlannedEntry): void {
    const next = new Set(this.excluded);
    if (next.has(entry)) next.delete(entry);
    else next.add(entry);
    this.excluded = next;
  }

  /** Exclude or re-include every record on the page at once (⌘/Ctrl-click). */
  setAllExcluded(excluded: boolean): void {
    this.excluded = excluded ? new Set(this.plan.flatMap((book) => book.entries)) : new Set();
  }

  /** Pin a record's description open, closing any other; null/same toggles it shut. */
  peekTip(entry: PlannedEntry): void {
    this.openTip = this.openTip === entry ? undefined : entry;
  }

  async init(): Promise<void> {
    const stored = loadPlan();
    if (stored) {
      this.plan = stored.plan;
      this.importedAt = stored.importedAt;
      this.view = "review";
    }
    await this.restoreAuth();
  }

  async analyze(files: File[]): Promise<void> {
    this.error = "";
    this.view = "analyzing";
    try {
      const texts = await Promise.all(files.map((file) => file.text()));
      const where = stores();
      const kindle: Clipping[] = [];
      const highlighted: Clipping[] = [];

      for (const text of texts) {
        if (isHighlightedExport(text)) {
          const exported = parseHighlightedExport(text);
          // The export carries the ISBN, so pin the book in the title store and
          // resolution becomes a free local lookup.
          const isbn13 = exported.isbn ? toIsbn13(exported.isbn) : undefined;
          if (isbn13) {
            const book = {
              title: exported.title,
              ...(exported.author ? { author: exported.author } : {}),
            };
            await where.titleStore.set(slugifyBook(book), isbn13);
          }
          highlighted.push(...exported.clippings);
        } else {
          kindle.push(...parseClippings(text));
        }
      }

      if (kindle.length === 0 && highlighted.length === 0) {
        this.error = "No highlights found in those files.";
        this.view = "landing";
        return;
      }

      this.importedAt = new Date().toISOString();
      const base = { importedAt: this.importedAt, resolve: where };
      const plan: PlannedBook[] = [];
      if (kindle.length > 0) {
        const conformsTo = KINDLE_LOCATION_NS;
        plan.push(
          ...(await planSync(kindle, { ...base, conformsTo, generator: generatorFor(conformsTo) })),
        );
      }
      if (highlighted.length > 0) {
        const conformsTo = PHYSICAL_BOOK_NS;
        plan.push(
          ...(await planSync(highlighted, {
            ...base,
            conformsTo,
            generator: generatorFor(conformsTo),
          })),
        );
      }
      this.plan = plan;
      this.savePlan();
      this.view = "review";
      await this.refreshExisting();
    } catch (error) {
      this.error = message(error);
      this.view = "landing";
    }
  }

  async setIsbn(bookIndex: number, isbn: string): Promise<void> {
    const isbn13 = toIsbn13(isbn);
    if (!isbn13) {
      this.error = "That doesn't look like a valid ISBN.";
      return;
    }
    this.error = "";
    const target = this.plan[bookIndex];
    if (!target) return;

    const where = stores();
    if (target.book.asin) await where.store.set(target.book.asin, isbn13);
    else await where.titleStore.set(slugifyBook(target.book), isbn13);

    const replanned = await planBook(
      target.book,
      target.entries.map((entry) => entry.clipping),
      {
        conformsTo: target.conformsTo,
        importedAt: this.importedAt,
        generator: generatorFor(target.conformsTo),
        resolve: where,
      },
    );
    this.plan = this.plan.map((book, index) => (index === bookIndex ? replanned : book));
    this.savePlan();
  }

  async login(handle: string): Promise<void> {
    this.savePlan();
    await beginLogin(handle.trim());
  }

  /** Sign out of atproto, keeping the imported highlights on the page. */
  async logout(): Promise<void> {
    const did = this.did;
    this.agent = undefined;
    this.did = undefined;
    this.handle = undefined;
    this.existing = new Map();
    localStorage.removeItem(DID_KEY);
    if (did) await signOut(did);
  }

  async restoreAuth(): Promise<void> {
    const saved = localStorage.getItem(DID_KEY);
    if (!saved) return;
    const restored = await restoreSession(saved);
    if (!restored) {
      localStorage.removeItem(DID_KEY);
      return;
    }
    this.agent = restored.agent;
    this.did = restored.did;
    this.handle = restored.handle;
    await this.refreshExisting();
  }

  async save(): Promise<void> {
    if (!this.agent) return;
    this.saving = true;
    this.savedCount = 0;
    this.error = "";
    try {
      const client = createRepoClient(this.agent);
      const toSave: PlannedEntry[] = [];
      for (const book of this.plan) {
        if (!book.isbn13) continue;
        for (const entry of book.entries) {
          if (this.excluded.has(entry)) continue;
          const status = this.statusFor(book, entry);
          if (status === "fresh" || status === "update") toSave.push(entry);
        }
      }
      this.savingTotal = toSave.length;
      for (const entry of toSave) {
        await client.putNote(entry.rkey!, entry.note!);
        this.savedCount++;
      }
      await this.refreshExisting();
    } catch (error) {
      this.error = message(error);
    } finally {
      this.saving = false;
    }
  }

  /**
   * Start over: drop the imported highlights and return to the upload screen.
   * Keeps the cached ISBN mappings (localStorage) and the signed-in session.
   */
  reset(): void {
    sessionStorage.removeItem(PLAN_KEY);
    this.plan = [];
    this.view = "landing";
    this.error = "";
    this.importedAt = "";
    this.excluded = new Set();
    this.openTip = undefined;
    this.savedCount = 0;
    this.savingTotal = 0;
  }

  private async refreshExisting(): Promise<void> {
    if (!this.agent) return;
    try {
      this.existing = await listExistingNotes(this.agent);
    } catch {
      // Non-fatal: without this we just can't distinguish saved vs. new records.
    }
  }

  private savePlan(): void {
    const data: StoredPlan = { importedAt: this.importedAt, plan: this.plan };
    sessionStorage.setItem(PLAN_KEY, JSON.stringify(data));
  }
}

function loadPlan(): StoredPlan | undefined {
  try {
    const raw = sessionStorage.getItem(PLAN_KEY);
    return raw ? (JSON.parse(raw) as StoredPlan) : undefined;
  } catch {
    return undefined;
  }
}

export const app = new AppState();
