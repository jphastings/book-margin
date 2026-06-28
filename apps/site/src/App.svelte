<script lang="ts">
  import { onMount } from "svelte";
  import Analyzing from "./lib/Analyzing.svelte";
  import Callback from "./lib/Callback.svelte";
  import { setupOAuth } from "./lib/config.ts";
  import Dropzone from "./lib/Dropzone.svelte";
  import Landing from "./lib/Landing.svelte";
  import Review from "./lib/Review.svelte";
  import Spec from "./lib/Spec.svelte";
  import { app } from "./lib/state.svelte.ts";

  setupOAuth();

  // Normalise a trailing slash: a static host may serve /callback as /callback/.
  const path = location.pathname.replace(/\/+$/, "") || "/";
  const route =
    path === "/callback" ? "callback" : path === "/ns/kindle-location" ? "spec" : "app";

  onMount(() => {
    if (route === "app") void app.init();
  });
</script>

{#if route === "callback"}
  <Callback />
{:else if route === "spec"}
  <Spec />
{:else}
  <Dropzone onfile={(file) => void app.analyze(file)} />
  {#if app.view === "analyzing"}
    <Analyzing />
  {:else if app.view === "review"}
    <Review />
  {:else}
    <Landing />
  {/if}
{/if}
