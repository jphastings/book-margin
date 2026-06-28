<script lang="ts">
  import BookSection from "./BookSection.svelte";
  import Nav from "./Nav.svelte";
  import { app } from "./state.svelte.ts";

  const justSaved = $derived(!app.saving && app.savedCount > 0);
</script>

<Nav />

<main class="review">
  <div class="review-bar">
    <span>
      {#if app.error}<span class="error">{app.error}</span>
      {:else if justSaved}<span class="saved">Saved {app.savedCount} note(s) to your repo.</span>{/if}
    </span>
    <button class="link" onclick={() => app.reset()}>Start over</button>
  </div>

  {#each app.plan as book, i (book.book.title + (book.book.author ?? ""))}
    <BookSection {book} index={i} />
  {/each}
</main>
