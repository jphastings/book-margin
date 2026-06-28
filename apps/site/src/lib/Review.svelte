<script lang="ts">
  import BookSection from "./BookSection.svelte";
  import Nav from "./Nav.svelte";
  import RecordInspector from "./RecordInspector.svelte";
  import { app, type RowStatus } from "./state.svelte.ts";

  const justSaved = $derived(!app.saving && app.savedCount > 0);

  // Books with the most records needing attention rise to the top: most red,
  // then most blue, then yellow, then green. `index` stays the plan index so
  // ISBN edits target the right book.
  const sortedBooks = $derived(
    app.plan
      .map((book, index) => {
        const counts: Record<RowStatus, number> = {
          "missing-isbn": 0,
          fresh: 0,
          update: 0,
          present: 0,
        };
        for (const entry of book.entries) counts[app.statusFor(book, entry)]++;
        return { book, index, counts };
      })
      .sort(
        (a, b) =>
          b.counts["missing-isbn"] - a.counts["missing-isbn"] ||
          b.counts.fresh - a.counts.fresh ||
          b.counts.update - a.counts.update ||
          b.counts.present - a.counts.present,
      ),
  );
</script>

<Nav />

<main class="review">
  <div class="review-bar">
    <span>
      {#if app.error}<span class="error">{app.error}</span>
      {:else if justSaved}<span class="saved"
          >Saved {app.savedCount} note(s) to your repo.</span
        >{/if}
    </span>
  </div>

  {#each sortedBooks as { book, index } (book.book.title + (book.book.author ?? ""))}
    <BookSection {book} {index} />
  {/each}
</main>

<RecordInspector />
