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

  function locationLabel(): string {
    if (clipping.page !== undefined) return `p.${clipping.page}`;
    if (clipping.location) {
      return `loc. ${clipping.location.start}${clipping.location.end ? `–${clipping.location.end}` : ""}`;
    }
    return "";
  }
</script>

<article class="record record-{status}" class:record-excluded={excluded}>
  <!-- The gutter (left of the rule) peeks the status; the icon itself toggles it off. -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="record-gutter" onclick={() => app.peekTip(entry)}>
    <StatusIcon
      {status}
      {excluded}
      {showTip}
      ontoggle={toggleSkip}
      onshow={revealTip}
      onhide={dismissTip}
    />
  </div>
  <div class="record-body">
    {#if text}
      <blockquote class="quote">
        {#if where}<span class="loc">{where}</span>{" "}{/if}{text}
      </blockquote>
    {/if}
    {#if clipping.note}
      <p class="note">
        <svg
          class="note-pen"
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16v4z" />
          <path d="M13.5 6.5l4 4" />
        </svg>{clipping.note}
      </p>
    {/if}
  </div>
</article>
