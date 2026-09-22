<script lang="ts">
  import type { AppSummary } from "$lib/api/types";
  import { CATEGORY_LABELS } from "$lib/api/types";
  import VerdictBadge from "./VerdictBadge.svelte";
  import RatingStars from "./RatingStars.svelte";

  let { app }: { app: AppSummary } = $props();
</script>

<a
  href="/app/{app.app_id}"
  class="group flex flex-col rounded-sm border border-line bg-card p-5 shadow-[var(--theme-shadow-1)] transition-colors hover:border-line-strong hover:bg-hover"
>
  <div class="flex items-start gap-3">
    {#if app.icon}
      <img
        src={app.icon}
        alt=""
        loading="lazy"
        class="h-12 w-12 shrink-0 rounded-lg border border-line-subtle bg-raised object-contain"
        onerror={(e) => {
          (e.currentTarget as HTMLImageElement).remove();
        }}
      />
    {/if}
    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-medium text-fg group-hover:text-accent">{app.name}</p>
      <p class="truncate font-mono text-xs text-ink-dim">{app.app_id}</p>
    </div>
    {#if app.source === "flathub"}
      <span
        class="shrink-0 rounded-sm border border-line-strong px-1.5 py-0.5 font-mono text-[10px] text-muted"
        title="Flathub app, served through the omapak remote">flathub</span
      >
    {:else}
      <VerdictBadge verdict={app.verdict ?? "unpublished"} certified={app.certified} />
    {/if}
  </div>

  <p class="mt-2.5 line-clamp-2 min-h-10 text-sm text-muted">{app.summary}</p>

  <div class="mt-4 flex items-center justify-between gap-2 font-mono text-xs">
    <span class="truncate text-ink-dim">{CATEGORY_LABELS[app.category]}</span>
    <span class="flex shrink-0 items-center gap-1.5">
      {#if app.rating}
        <RatingStars value={app.rating.average} />
        <span class="text-muted">{app.rating.average.toFixed(1)}</span>
      {:else}
        <span class="text-ink-dim">unrated</span>
      {/if}
      {#if app.source === "omapak" && app.advisory_average !== undefined}
        <span class="text-accent" title="agent-judge advisory average">J{app.advisory_average.toFixed(1)}</span>
      {/if}
    </span>
  </div>
</a>
