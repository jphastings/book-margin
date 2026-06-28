<script lang="ts">
  import type { RowStatus } from "./state.svelte.ts";

  let {
    status,
    excluded = false,
    showTip = false,
    ontoggle,
    onshow,
    onhide,
  }: {
    status: RowStatus;
    excluded?: boolean;
    showTip?: boolean;
    ontoggle?: () => void;
    onshow?: () => void;
    onhide?: () => void;
  } = $props();

  const label: Record<RowStatus, string> = {
    present: "Already saved",
    fresh: "Will be saved",
    update: "Will be updated",
    "missing-isbn": "Can't be saved (no ISBN)",
  };
  const tip = $derived(excluded ? "Will not be saved" : label[status]);

  // Tapping the icon toggles exclusion; never let it bubble to the card.
  function onclick(event: MouseEvent) {
    event.stopPropagation();
    ontoggle?.();
  }
</script>

<button
  type="button"
  class="status status-{status}"
  class:status-excluded={excluded}
  aria-label={tip}
  aria-pressed={excluded}
  {onclick}
  onmouseenter={onshow}
  onmouseleave={onhide}
  onfocus={onshow}
  onblur={onhide}
>
  {#if excluded}
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M5.64 5.64l12.72 12.72" />
    </svg>
  {:else if status === "present"}
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </svg>
  {:else if status === "fresh"}
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M12 15V4" />
      <path d="M7.5 8.5L12 4l4.5 4.5" />
      <path d="M5 19h14" />
    </svg>
  {:else if status === "update"}
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16v4z" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  {:else}
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M12 3l9 16H3z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="16.6" r="0.1" />
    </svg>
  {/if}
  <span class="status-tip" class:visible={showTip}>{tip}</span>
</button>
