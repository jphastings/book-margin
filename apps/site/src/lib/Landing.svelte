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
  <Brand size="hero" />
  <h1>
    Sync your book highlights with <a href="https://margin.at">Margin.at</a>
  </h1>

  {#if app.error}<p class="error">{app.error}</p>{/if}

  <ul class="sources">
    <li class="source-card">
      <img class="source-logo" src="/logos/kindle.png" alt="Kindle" />
      <div class="source-text">
        <strong>Kindle</strong>
        <span><code>My&nbsp;Clippings.txt</code></span>
      </div>
    </li>
    <li class="source-card">
      <img class="source-logo" src="/logos/highlighted.png" alt="Highlighted" />
      <div class="source-text">
        <strong>Highlighted</strong>
        <span>Markdown exports</span>
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
