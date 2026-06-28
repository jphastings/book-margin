<script lang="ts">
  import { completeCallback } from "@byjp/kindle-margin-web";
  import { onMount } from "svelte";
  import { DID_KEY } from "./config.ts";

  let error = $state("");

  onMount(async () => {
    try {
      const { did } = await completeCallback();
      localStorage.setItem(DID_KEY, did);
      location.replace("/");
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  });
</script>

<main class="card">
  {#if error}
    <h1>Sign-in failed</h1>
    <p class="error">{error}</p>
    <p><a href="/">Back to start</a></p>
  {:else}
    <p>Finishing sign-in…</p>
  {/if}
</main>
