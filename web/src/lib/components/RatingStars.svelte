<script lang="ts">
  import Star from "@lucide/svelte/icons/star";

  let {
    value,
    size = 13,
  }: {
    value: number; // 1..5, fractional
    size?: number;
  } = $props();

  const full = $derived(Math.round(value));
</script>

<span class="inline-flex items-center gap-0.5" aria-label="{value.toFixed(1)} of 5">
  {#each [1, 2, 3, 4, 5] as i (i)}
    <Star
      {size}
      class={i <= full ? "fill-current text-accent" : "text-ink-dim"}
      aria-hidden="true"
    />
  {/each}
</span>
