<script lang="ts">
  import { onMount } from "svelte";

  let { onfiles }: { onfiles: (files: File[]) => void } = $props();
  let dragging = $state(false);
  let depth = 0;

  function hasFiles(event: DragEvent): boolean {
    return Array.from(event.dataTransfer?.types ?? []).includes("Files");
  }

  onMount(() => {
    const onEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth++;
      dragging = true;
    };
    const onLeave = () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) dragging = false;
    };
    const onOver = (event: DragEvent) => {
      if (hasFiles(event)) event.preventDefault();
    };
    const onDrop = (event: DragEvent) => {
      event.preventDefault();
      depth = 0;
      dragging = false;
      const files = Array.from(event.dataTransfer?.files ?? []);
      if (files.length > 0) onfiles(files);
    };

    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
    };
  });
</script>

{#if dragging}
  <div class="dropzone" role="presentation">
    <div class="dropzone-frame">
      <p>Drop your highlight exports</p>
    </div>
  </div>
{/if}
