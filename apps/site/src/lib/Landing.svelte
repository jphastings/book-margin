<script lang="ts">
  import Brand from "./Brand.svelte";
  import { app } from "./state.svelte.ts";

  let fileInput: HTMLInputElement;

  function pick(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) void app.analyze(file);
  }
</script>

<main class="landing">
  <Brand size="hero" />
  <h1>
    Sync your book notes & highlights with <a href="https://margin.at"
      >Margin.at</a
    >
  </h1>

  {#if app.error}<p class="error">{app.error}</p>{/if}

  <button class="primary big" onclick={() => fileInput.click()}
    >Upload My&nbsp;Clippings.txt</button
  >
  <input
    bind:this={fileInput}
    type="file"
    accept=".txt,text/plain"
    hidden
    onchange={pick}
  />

  <p class="hint">…or drag the file anywhere onto this page.</p>
</main>
