<script lang="ts">
  import type { PlannedBook, PlannedEntry } from "@byjp/book-margin-core";
  import type { RowStatus } from "./state.svelte.ts";
  import StatusIcon from "./StatusIcon.svelte";

  let { book, entry, status }: { book: PlannedBook; entry: PlannedEntry; status: RowStatus } =
    $props();

  const clipping = $derived(entry.clipping);
  const text = $derived(entry.note?.target.selector?.exact ?? clipping.text);
  const tint = "var(--accent)";
  const where = $derived(locationLabel());

  function locationLabel(): string {
    if (clipping.page !== undefined) return `p.${clipping.page}`;
    if (clipping.location) {
      return `loc. ${clipping.location.start}${clipping.location.end ? `–${clipping.location.end}` : ""}`;
    }
    return "";
  }
</script>

<article class="record">
  <div class="record-head">
    <span class="source">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 5.5A1.5 1.5 0 0 1 4.5 4H11v15H4.5A1.5 1.5 0 0 0 3 20.5z" />
        <path d="M21 5.5A1.5 1.5 0 0 0 19.5 4H13v15h6.5a1.5 1.5 0 0 1 1.5 1.5z" />
      </svg>
      <span class="book-title">{book.book.title}</span>
      {#if where}<span class="loc">{where}</span>{/if}
    </span>
    <StatusIcon {status} />
  </div>

  {#if text}
    <blockquote class="quote" style="--tint: {tint}">{text}</blockquote>
  {/if}
  {#if clipping.note}
    <p class="note"><span class="note-label">Note</span>{clipping.note}</p>
  {/if}
</article>
