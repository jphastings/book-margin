<script lang="ts">
  import Brand from "./Brand.svelte";
  import { app } from "./state.svelte.ts";

  let handle = $state("");
  let cycle = 0;
  let cycleCount = 0;
  let resetDialog: HTMLDialogElement;
  let logoutDialog: HTMLDialogElement;

  /** Scroll to the next book still missing an ISBN, cycling back to the first. */
  function scrollToNextMissing() {
    const books = Array.from(
      document.querySelectorAll<HTMLElement>(".book.missing"),
    );
    if (books.length === 0) return;
    // Reset the cursor whenever the set of missing books changes.
    if (books.length !== cycleCount) {
      cycleCount = books.length;
      cycle = 0;
    }
    const target = books[cycle % books.length]!;
    cycle = (cycle + 1) % books.length;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    target
      .querySelector<HTMLInputElement>(".isbn-fix input")
      ?.focus({ preventScroll: true });
  }
</script>

<nav class="nav">
  <Brand size="nav" />

  <span class="nav-summary">
    <strong>{app.totalRecords}</strong
    >&nbsp;records&nbsp;·&nbsp;{app.resolvedBooks}&nbsp;books{#if app.missingBooks > 0}&nbsp;·&nbsp;<button
        type="button"
        class="need-isbn"
        onclick={scrollToNextMissing}
        >{app.missingBooks}&nbsp;need&nbsp;ISBN</button
      >{/if}
  </span>

  <div class="nav-right">
    {#if app.loggedIn}
      <button
        type="button"
        class="who"
        title="Log out of @{app.handle}"
        onclick={() => logoutDialog.showModal()}>@{app.handle}</button
      >
      {#if app.sessionExpired}
        <button
          class="primary"
          type="button"
          title="Your session expired — sign in again to save"
          onclick={() => void app.reauth()}
        >
          Log in again
        </button>
      {:else}
        <button
          class="primary"
          onclick={() => void app.save()}
          disabled={app.saving || app.pendingCount === 0}
        >
          {#if app.saving}
            Saving {app.savedCount}/{app.savingTotal}…
          {:else if app.pendingCount === 0}
            No changes
          {:else}
            Save {app.pendingCount} note{app.pendingCount === 1 ? "" : "s"}
          {/if}
        </button>
      {/if}
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
        <button class="primary" type="submit" disabled={!handle.trim()}
          >Log in</button
        >
      </form>
    {/if}

    <button
      type="button"
      class="reset"
      aria-label="Start over"
      title="Start over"
      onclick={() => resetDialog.showModal()}
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </svg>
    </button>
  </div>

  <dialog class="confirm" bind:this={resetDialog}>
    <h2>Start over?</h2>
    <p>
      This will clear the list of highlights to let you upload new files. None
      of your Margin records will be removed or changed.
    </p>
    <div class="confirm-actions">
      <button type="button" class="ghost" onclick={() => resetDialog.close()}
        >Cancel</button
      >
      <button
        type="button"
        class="danger"
        onclick={() => {
          resetDialog.close();
          app.reset();
        }}>Start over</button
      >
    </div>
  </dialog>

  <dialog class="confirm" bind:this={logoutDialog}>
    <h2>Log out?</h2>
    <p>
      You'll be signed out of <strong>@{app.handle}</strong>. The list of
      highlights will remain.
    </p>
    <div class="confirm-actions">
      <button type="button" class="ghost" onclick={() => logoutDialog.close()}
        >Cancel</button
      >
      <button
        type="button"
        class="danger"
        onclick={() => {
          logoutDialog.close();
          void app.logout();
        }}>Log out</button
      >
    </div>
  </dialog>
</nav>
