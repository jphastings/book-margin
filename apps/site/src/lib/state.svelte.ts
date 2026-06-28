import { parseClippings } from "@byjp/kindle-clippings";
import {
  HOMEPAGE,
  KINDLE_LOCATION_NS,
  type MarginGenerator,
  type MarginNote,
  planBook,
  type PlannedBook,
  type PlannedEntry,
  planSync,
  recordsEqual,
  slugifyBook,
  toIsbn13,
} from "@byjp/book-margin-core";
import {
  type Authed,
  beginLogin,
  createLocalIsbnStore,
  createRepoClient,
  listExistingNotes,
  restoreSession,
} from "@byjp/book-margin-web";
import { DID_KEY } from "./config.ts";

const PLAN_KEY = "book-margin:plan";
const GENERATOR: MarginGenerator = {
  id: HOMEPAGE,
  name: "Book Margin (Web)",
  homepage: HOMEPAGE,
};

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

class AppState {
  view = $state<View>("landing");
  plan = $state<PlannedBook[]>([]);
  importedAt = $state("");
  did = $state<string | undefined>(undefined);
  handle = $state<string | undefined>(undefined);
  agent = $state<Authed["agent"] | undefined>(undefined);
  existing = $state<Map<string, MarginNote>>(new Map());
  /** rkeys the user has toggled off; excluded from the save. */
  excluded = $state<Set<string>>(new Set());
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
        if (entry.rkey && this.excluded.has(entry.rkey)) continue;
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
    return recordsEqual(entry.note, stored) ? "present" : "update";
  }

  isExcluded(rkey: string): boolean {
    return this.excluded.has(rkey);
  }

  toggleExcluded(rkey: string): void {
    const next = new Set(this.excluded);
    if (next.has(rkey)) next.delete(rkey);
    else next.add(rkey);
    this.excluded = next;
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

  async analyze(file: File): Promise<void> {
    this.error = "";
    this.view = "analyzing";
    try {
      const clippings = parseClippings(await file.text());
      if (clippings.length === 0) {
        this.error = "No highlights found in that file.";
        this.view = "landing";
        return;
      }
      this.importedAt = new Date().toISOString();
      this.plan = await planSync(clippings, {
        conformsTo: KINDLE_LOCATION_NS,
        importedAt: this.importedAt,
        generator: GENERATOR,
        resolve: stores(),
      });
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
        conformsTo: KINDLE_LOCATION_NS,
        importedAt: this.importedAt,
        generator: GENERATOR,
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
          if (entry.rkey && this.excluded.has(entry.rkey)) continue;
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

  reset(): void {
    sessionStorage.removeItem(PLAN_KEY);
    this.plan = [];
    this.view = "landing";
    this.error = "";
    this.savedCount = 0;
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
