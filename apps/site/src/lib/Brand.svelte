<script lang="ts">
  let { size = "nav" }: { size?: "nav" | "hero" } = $props();
</script>

<span class="brand brand-{size}">
  <span class="brand-book">Book</span><span class="brand-margin">Margin</span>
</span>
