<script lang="ts">
  import type { RowStatus } from "./state.svelte.ts";

  let {
    status,
    excluded = false,
    ontoggle,
  }: { status: RowStatus; excluded?: boolean; ontoggle?: () => void } = $props();

  const label: Record<RowStatus, string> = {
    present: "Already saved — no change needed",
    fresh: "Will be uploaded",
    update: "Will be updated",
    "missing-isbn": "No ISBN — can't be saved",
  };
  const tip = $derived(excluded ? "Skipped — tap to include" : label[status]);
</script>

<button
  type="button"
  class="status status-{status}"
  class:status-excluded={excluded}
  aria-label={tip}
  aria-pressed={excluded}
  onclick={ontoggle}
>
  {#if status === "present"}
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </svg>
  {:else if status === "fresh"}
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 15V4" />
      <path d="M7.5 8.5L12 4l4.5 4.5" />
      <path d="M5 19h14" />
    </svg>
  {:else if status === "update"}
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16v4z" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  {:else}
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3l9 16H3z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="16.6" r="0.1" />
    </svg>
  {/if}
  <span class="status-tip">{tip}</span>
</button>
