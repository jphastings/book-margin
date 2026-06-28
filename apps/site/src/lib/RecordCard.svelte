<script lang="ts">
  import type { PlannedEntry } from "@byjp/book-margin-core";
  import { app, type RowStatus } from "./state.svelte.ts";
  import StatusIcon from "./StatusIcon.svelte";

  let { entry, status }: { entry: PlannedEntry; status: RowStatus } = $props();

  const excluded = $derived(app.isExcluded(entry));
  const clipping = $derived(entry.clipping);

  // Tapping the card peeks the status description (only one open at a time);
  // tapping the icon toggles exclusion (and pins this card's description).
  const showTip = $derived(app.openTip === entry);

  function toggleSkip() {
    app.toggleExcluded(entry);
    app.openTip = entry;
  }

  // Hover/focus shows this description and hides any other; leaving clears it
  // (unless another card has since taken over).
  function revealTip() {
    app.openTip = entry;
  }
  function dismissTip() {
    if (app.openTip === entry) app.openTip = undefined;
  }

  const text = $derived(entry.note?.target.selector?.exact ?? clipping.text);
  const where = $derived(locationLabel());
  const date = $derived(formatDate(clipping.addedAt));

  function locationLabel(): string {
    if (clipping.page !== undefined) return `p.${clipping.page}`;
    if (clipping.location) {
      return `loc. ${clipping.location.start}${clipping.location.end ? `–${clipping.location.end}` : ""}`;
    }
    return "";
  }

  function formatDate(iso?: string): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    // addedAt encodes the device's wall-clock time as UTC, so read the UTC date.
    return d.toISOString().slice(0, 10);
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<article
  class="record record-{status}"
  class:record-excluded={excluded}
  onclick={() => app.peekTip(entry)}
>
  <StatusIcon
    {status}
    {excluded}
    {showTip}
    ontoggle={toggleSkip}
    onshow={revealTip}
    onhide={dismissTip}
  />
  <div class="record-body">
    {#if text}
      <blockquote class="quote">{#if where}<span class="loc">{where}</span>{" "}{/if}{text}</blockquote>
    {/if}
    {#if clipping.note}
      <p class="note">
        <svg class="note-pen" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16v4z" />
          <path d="M13.5 6.5l4 4" />
        </svg>{clipping.note}
      </p>
    {/if}
    {#if date}
      <div class="meta">{date}</div>
    {/if}
  </div>
</article>
