<script lang="ts">
  import type { PlannedBook, PlannedEntry } from "@byjp/book-margin-core";
  import { app, type RowStatus } from "./state.svelte.ts";
  import StatusIcon from "./StatusIcon.svelte";

  let { book, entry, status }: { book: PlannedBook; entry: PlannedEntry; status: RowStatus } =
    $props();

  const excluded = $derived(app.isExcluded(entry));
  const clipping = $derived(entry.clipping);

  // Tapping the card peeks the status description (only one open at a time);
  // tapping the icon toggles exclusion (and pins this card's description).
  const showTip = $derived(app.openTip === entry);

  function toggleSkip() {
    app.toggleExcluded(entry);
    app.openTip = entry;
  }
  const text = $derived(entry.note?.target.selector?.exact ?? clipping.text);
  const where = $derived(locationLabel());

  function locationLabel(): string {
    if (clipping.page !== undefined) return `p.${clipping.page}`;
    if (clipping.location) {
      return `loc. ${clipping.location.start}${clipping.location.end ? `–${clipping.location.end}` : ""}`;
    }
    return "";
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<article
  class="record record-{status}"
  class:record-excluded={excluded}
  onclick={() => app.peekTip(entry)}
>
  <div class="record-head">
    <span class="source">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 5.5A1.5 1.5 0 0 1 4.5 4H11v15H4.5A1.5 1.5 0 0 0 3 20.5z" />
        <path d="M21 5.5A1.5 1.5 0 0 0 19.5 4H13v15h6.5a1.5 1.5 0 0 1 1.5 1.5z" />
      </svg>
      <span class="book-title">{book.book.title}</span>
      {#if where}<span class="loc">{where}</span>{/if}
    </span>
    <StatusIcon {status} {excluded} {showTip} ontoggle={toggleSkip} />
  </div>

  {#if text}
    <blockquote class="quote">{text}</blockquote>
  {/if}
  {#if clipping.note}
    <p class="note"><span class="note-label">Note</span>{clipping.note}</p>
  {/if}
</article>
