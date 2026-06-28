<script lang="ts">
  import Brand from "./Brand.svelte";
  import { app } from "./state.svelte.ts";

  let handle = $state("");
  let cycle = 0;
  let cycleCount = 0;

  /** Scroll to the next book still missing an ISBN, cycling back to the first. */
  function scrollToNextMissing() {
    const books = Array.from(document.querySelectorAll<HTMLElement>(".book.missing"));
    if (books.length === 0) return;
    // Reset the cursor whenever the set of missing books changes.
    if (books.length !== cycleCount) {
      cycleCount = books.length;
      cycle = 0;
    }
    const target = books[cycle % books.length]!;
    cycle = (cycle + 1) % books.length;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    target.querySelector<HTMLInputElement>(".isbn-fix input")?.focus({ preventScroll: true });
  }
</script>

<nav class="nav">
  <Brand size="nav" />

  <span class="nav-summary">
    <strong>{app.totalRecords}</strong>&nbsp;records&nbsp;·&nbsp;{app.resolvedBooks}&nbsp;books{#if
      app.missingBooks > 0}&nbsp;·&nbsp;<button type="button" class="need-isbn" onclick={scrollToNextMissing}
        >{app.missingBooks}&nbsp;need&nbsp;ISBN</button
      >{/if}
  </span>

  <div class="nav-right">
    {#if app.loggedIn}
      <span class="who" title={app.did}>@{app.handle}</span>
      <button
        class="primary"
        onclick={() => void app.save()}
        disabled={app.saving || app.pendingCount === 0}
      >
        {#if app.saving}
          Saving {app.savedCount}/{app.savingTotal}…
        {:else}
          Save {app.pendingCount} note{app.pendingCount === 1 ? "" : "s"}
        {/if}
      </button>
    {:else}
      <form
        onsubmit={(e) => {
          e.preventDefault();
          void app.login(handle);
        }}
      >
        <input
          type="text"
          bind:value={handle}
          placeholder="you.bsky.social"
          autocomplete="username"
          spellcheck="false"
        />
        <button class="primary" type="submit" disabled={!handle.trim()}>Log in</button>
      </form>
    {/if}
  </div>
</nav>
