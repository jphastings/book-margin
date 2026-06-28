<script lang="ts">
  import { recordsEqual } from "@byjp/book-margin-core";
  import { diffYaml, toYamlLines, type YamlLine } from "./recordYaml.ts";
  import { app } from "./state.svelte.ts";

  let dialog = $state<HTMLDialogElement>();

  const entry = $derived(app.inspecting);
  const record = $derived(entry?.note);
  const stored = $derived(entry?.rkey ? app.existing.get(entry.rkey) : undefined);

  // A record is a real update only if it differs once createdAt is ignored for
  // undated highlights (matching how the review decides present vs. update).
  const changed = $derived.by(() => {
    if (!record || !stored) return false;
    const ignore = entry?.clipping.addedAt ? undefined : ["createdAt"];
    return !recordsEqual(record, stored, ignore);
  });

  const lines = $derived(record ? toYamlLines(record) : []);
  const diff = $derived(record && stored && changed ? diffYaml(stored, record) : null);

  $effect(() => {
    if (app.inspecting && !dialog?.open) dialog?.showModal();
    else if (!app.inspecting) dialog?.close();
  });
</script>

{#snippet yaml(line: YamlLine)}
  {#if line.bullet}<span class="y-dash">-</span>{/if}{#if line.key !== null}<span class="y-key"
      >{line.key}</span
    ><span class="y-punct">:</span>{/if}{#if line.value !== null}<span class="y-val"
      >{line.value}</span
    >{/if}
{/snippet}

<dialog class="inspect" bind:this={dialog} onclose={() => (app.inspecting = undefined)}>
  <header class="inspect-head">
    <h2>{diff ? "Changes to be written" : "Record to be written"}</h2>
    <button type="button" class="inspect-close" aria-label="Close" onclick={() => dialog?.close()}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  </header>

  <div class="inspect-body">
    {#if diff}
      {#each diff as d}
        <div class="y-line diff-{d.kind}">
          <span class="y-gutter">{d.kind === "add" ? "+" : d.kind === "del" ? "−" : ""}</span>
          <span class="y-content" style:padding-left="{d.line.indent * 1.25}rem">{@render yaml(d.line)}</span>
        </div>
      {/each}
    {:else}
      {#each lines as line}
        <div class="y-line">
          <span class="y-content" style:padding-left="{line.indent * 1.25}rem">{@render yaml(line)}</span>
        </div>
      {/each}
    {/if}
  </div>
</dialog>
