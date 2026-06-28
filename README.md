# Book Margin

A tool for syncing your [Kindle notes/highlights](https://read.amazon.com/notebook) with your atproto account — specifically, [Margin](https://margin.at) notes.

Each highlight or note becomes a [W3C Web Annotation](https://www.w3.org/TR/annotation-model/) record (`at.margin.note`) in your atproto repository: the highlighted text as a `TextQuoteSelector`, the Kindle location preserved in a refining `FragmentSelector`, and the book identified by ISBN where one can be found. Records are written with deterministic keys, so re-syncing upserts in place rather than creating duplicates.

## CLI: `book-margin`

Syncs a Kindle `My Clippings.txt` export into your Margin notes.

### 1. Get your highlights

Connect your Kindle over USB and copy `documents/My Clippings.txt` off the device.

### 2. Preview — no login, no writes

```sh
book-margin --file "My Clippings.txt" --dry-run
```

Reports how many books resolved to an ISBN, how many records would be written, and any books **held back** because no confident ISBN match was found.

### 3. Sync to your account

```sh
book-margin --file "My Clippings.txt" --identifier you.example.com --password xxxx-xxxx-xxxx-xxxx
```

- Authenticates with an atproto **app password**. Your PDS is resolved automatically from your handle, so there's no need to pass `--service` (unless you log in by email).
- The session is saved to `~/.config/book-margin/session.json`; later runs only need `--file`.
- Re-running is safe — writes are idempotent.

The app password can also be supplied via the `KINDLE_MARGIN_APP_PASSWORD` environment variable.

### Options

| Flag                        | Description                                       |
| --------------------------- | ------------------------------------------------- |
| `-f, --file <path>`         | Path to `My Clippings.txt` (required)             |
| `-i, --identifier <handle>` | Your atproto handle or DID (first login)          |
| `-p, --password <pw>`       | App password (or `KINDLE_MARGIN_APP_PASSWORD`)    |
| `--service <url>`           | PDS URL (default: auto-resolved from your handle) |
| `--overrides <path>`        | JSON file mapping `ASIN` → `ISBN`                 |
| `--session <path>`          | Session file location                             |
| `--dry-run`                 | Resolve and map, but don't authenticate or write  |
| `-h, --help`                | Show help                                         |

### ISBN resolution

Books are resolved to a canonical ISBN-13 through a keyless chain: an explicit override, the persistent stores below, an ASIN that is itself an ISBN-10, an exact [Wikidata](https://www.wikidata.org) match, then a fuzzy [OpenLibrary](https://openlibrary.org) title/author search. Resolution is **strict**: a book that can't be matched confidently is held back rather than guessed, and its annotations are not written.

Every successful lookup is cached so future runs skip the network. The cache files double as manual pins — create or edit one to fix a book by hand:

- ASIN-keyed: `~/.book-margin/asins/<asin>.txt`
- Title-keyed (for books with no ASIN, like `My Clippings.txt`): `~/.book-margin/titles/<slug>.txt`

Each file holds a single ISBN. When a book is held back, `book-margin` prints the exact file to create.

### Running from the repo

The CLI is TypeScript, run directly on Node 24+:

```sh
node packages/cli/src/main.ts --file "My Clippings.txt" --dry-run
```

(Use `node` directly rather than `vp node`, which intercepts the `--` flags.)
