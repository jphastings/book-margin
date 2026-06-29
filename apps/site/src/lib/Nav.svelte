<script lang="ts">
  import Brand from "./Brand.svelte";
  import { app } from "./state.svelte.ts";

  let handle = $state("");
  let cycle = 0;
  let cycleCount = 0;
  let resetDialog: HTMLDialogElement;
  let logoutDialog: HTMLDialogElement;

  // Atmosphere handle hint: shown when the field is empty-while-focused, or
  // holds something that isn't a handle, for more than a second.
  const HANDLE_DOMAINS = [
    ".bsky.social",
    ".eurosky.social",
    ".blacksky.app",
    ".sprk.so",
    ".selfhosted.social",
    ".surf.social",
    ".northsky.social",
    ".npmx.social",
  ];

  let handleFocused = $state(false);
  let hintOpen = $state(false);
  let domainIndex = $state(0);
  let hintEl = $state<HTMLElement>();

  const handleDomain = $derived(
    HANDLE_DOMAINS[domainIndex % HANDLE_DOMAINS.length],
  );

  /** A bare domain name (no leading `@`), or a did:plc:/did:web: identifier. */
  function isHandleLike(value: string): boolean {
    const v = value.trim();
    if (!v) return false;
    if (/^did:(plc|web):.+/i.test(v)) return true;
    return /^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(v);
  }

  const hintWanted = $derived.by(() => {
    const empty = handle.trim() === "";
    return (!empty && !isHandleLike(handle)) || (empty && handleFocused);
  });

  // A second after the field goes wanting, raise the hint (and lower it at once
  // when it's satisfied). hintWanted is a boolean, so typing more bad input
  // doesn't restart the timer — only entering/leaving the state does.
  $effect(() => {
    if (!hintWanted) {
      hintOpen = false;
      return;
    }
    const timer = setTimeout(() => (hintOpen = true), 1000);
    return () => clearTimeout(timer);
  });

  // While the hint is up, roll the example domain once a second, from the top.
  $effect(() => {
    if (!hintOpen) return;
    domainIndex = 0;
    const id = setInterval(() => {
      domainIndex = (domainIndex + 1) % HANDLE_DOMAINS.length;
    }, 1500);
    return () => clearInterval(id);
  });

  // Drive the popover (top layer, so it can't be clipped) from `hintOpen`.
  $effect(() => {
    if (!hintEl) return;
    if (hintOpen && !hintEl.matches(":popover-open")) hintEl.showPopover();
    else if (!hintOpen && hintEl.matches(":popover-open")) hintEl.hidePopover();
  });

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
          onfocus={() => (handleFocused = true)}
          onblur={() => (handleFocused = false)}
          placeholder="eg. you.bsky.social"
          autocomplete="username"
          spellcheck="false"
        />
        <button class="primary" type="submit" disabled={!isHandleLike(handle)}
          >Log in</button
        >
      </form>
      <div class="handle-hint" popover="manual" bind:this={hintEl}>
        Use your atmosphere handle<br />
        <i>eg.</i>&nbsp;<span class="handle-eg"
          >you<span class="rotator"
            >{#key handleDomain}<span class="rotator-item">{handleDomain}</span
              >{/key}</span
          ></span
        >
      </div>
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
