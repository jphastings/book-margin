<script lang="ts">
  import type { RowStatus } from "./state.svelte.ts";

  let { status }: { status: RowStatus } = $props();

  const label: Record<RowStatus, string> = {
    new: "Will be written",
    update: "Will be updated",
    "missing-isbn": "Missing ISBN",
  };
</script>

<span class="status status-{status}" title={label[status]} aria-label={label[status]}>
  {#if status === "new"}
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
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
</span>
