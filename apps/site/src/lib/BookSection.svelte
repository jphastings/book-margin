<script lang="ts">
  import type { PlannedBook, PlannedEntry } from "@byjp/book-margin-core";
  import { app, STATUS_RANK } from "./state.svelte.ts";
  import RecordCard from "./RecordCard.svelte";

  let { book, index }: { book: PlannedBook; index: number } = $props();

  let editing = $state(false);
  let isbn = $state("");

  function addedTime(entry: PlannedEntry): number {
    return entry.clipping.addedAt ? Date.parse(entry.clipping.addedAt) : 0;
  }

  // Within a book: by status (red → blue → yellow → green), then newest first.
  const rows = $derived(
    book.entries
      .map((entry) => ({ entry, status: app.statusFor(book, entry) }))
      .sort(
        (a, b) =>
          STATUS_RANK[a.status] - STATUS_RANK[b.status] || addedTime(b.entry) - addedTime(a.entry),
      ),
  );

  // The book's colour = its most urgent record's status (first after the sort).
  const titleStatus = $derived(rows[0]?.status ?? "fresh");

  function startEdit() {
    isbn = book.isbn13 ?? "";
    editing = true;
  }

  async function submit() {
    await app.setIsbn(index, isbn);
    if (app.error === "") editing = false;
  }

  function onKeydown(event: KeyboardEvent) {
    // Escape cancels an edit of an already-resolved book.
    if (event.key === "Escape" && book.isbn13) editing = false;
  }
</script>

<section class="book" class:missing={!book.isbn13}>
  <header class="book-head">
    <div class="book-meta">
      <h2 class="title-{titleStatus}">{book.book.title}</h2>
      {#if book.book.author}<p class="book-author">{book.book.author}</p>{/if}
    </div>

    <div class="isbn-control">
      {#if editing || !book.isbn13}
        <form
          class="isbn-entry"
          onsubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <!-- svelte-ignore a11y_autofocus -->
          <input
            type="text"
            bind:value={isbn}
            placeholder="Enter ISBN"
            spellcheck="false"
            autofocus={editing}
            onkeydown={onKeydown}
          />
          <button type="submit" class="isbn-go" disabled={!isbn.trim()} aria-label="Set ISBN">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7" />
            </svg>
          </button>
        </form>
      {:else}
        <button type="button" class="book-isbn" onclick={startEdit} title="Edit ISBN">
          ISBN&nbsp;{book.isbn13}
        </button>
      {/if}
    </div>
  </header>

  {#each rows as { entry, status }, i (entry.rkey ?? i)}
    <RecordCard {book} {entry} {status} />
  {/each}
</section>
