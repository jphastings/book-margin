<script lang="ts">
  import Brand from "./Brand.svelte";
  import { app } from "./state.svelte.ts";

  let fileInput: HTMLInputElement;

  function pick(event: Event) {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    if (files.length > 0) void app.analyze(files);
  }
</script>

<main class="landing">
  <h1>
    Sync your <u>Book</u> highlights to
    <a href="https://margin.at">Margin.at</a>
  </h1>

  {#if app.error}<p class="error">{app.error}</p>{/if}

  <ul class="sources">
    <li class="source-card">
      <a
        href="https://amazon.co.uk/Kindle-Ereaders/b?node=5157836031"
        target="_blank"
      >
        <img class="source-logo" src="/logos/kindle.png" alt="Kindle" />
      </a>
      <div class="source-text">
        <strong>Kindle devices</strong>
        <code>My&nbsp;Clippings.txt</code>
      </div>
    </li>
    <li class="source-card">
      <a href="https://highlighted.app/" target="_blank">
        <img
          class="source-logo"
          src="/logos/highlighted.png"
          alt="Highlighted"
        />
      </a>
      <div class="source-text">
        <strong>Highlighted</strong>
        <code>Highlights&nbsp;for&hellip;.md</code>
      </div>
    </li>
  </ul>

  <button class="primary big" onclick={() => fileInput.click()}
    >Upload files</button
  >
  <input
    bind:this={fileInput}
    type="file"
    accept=".txt,.md,text/plain,text/markdown"
    multiple
    hidden
    onchange={pick}
  />

  <p class="hint">…or drag onto this page.</p>
</main>
