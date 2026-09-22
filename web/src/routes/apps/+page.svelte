<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { writable } from "svelte/store";
  import { useApps, useAppDetail, useFeatured } from "$lib/api/queries";
  import type { AppSource } from "$lib/api/types";
  import { CATEGORY_LABELS } from "$lib/api/types";
  import AppCard from "$lib/components/AppCard.svelte";
  import RatingStars from "$lib/components/RatingStars.svelte";
  import VerdictBadge from "$lib/components/VerdictBadge.svelte";
  import Copy from "@lucide/svelte/icons/copy";
  import Check from "@lucide/svelte/icons/check";

  // Filter state lives in the URL — the store page is linkable SPA state.
  const q = $derived(page.url.searchParams.get("q") ?? "");
  const source = $derived((page.url.searchParams.get("source") ?? "all") as AppSource | "all");
  const category = $derived(page.url.searchParams.get("category") ?? "");

  // Sync reactive URL state into stores so query keys re-key live
  // (createQuery options accept a store — see lib/api/queries.ts).
  const sourceStore = writable<AppSource | "all">("all");
  $effect(() => {
    sourceStore.set(source);
  });

  const apps = useApps(sourceStore);
  const featured = useFeatured();

  const heroIdStore = writable("");
  $effect(() => {
    heroIdStore.set($featured.data?.app_id ?? "");
  });
  const heroDetail = useAppDetail(heroIdStore);

  const filtered = $derived.by(() => {
    const needle = q.trim().toLowerCase();
    return ($apps.data?.apps ?? []).filter(
      (a) =>
        (!category || a.category === category) &&
        (!needle ||
          a.app_id.toLowerCase().includes(needle) ||
          a.name.toLowerCase().includes(needle) ||
          a.summary.toLowerCase().includes(needle)),
    );
  });
  const omapakCount = $derived(($apps.data?.apps ?? []).filter((a) => a.source === "omapak").length);
  const flathubCount = $derived(($apps.data?.apps ?? []).filter((a) => a.source === "flathub").length);

  function setParam(key: string, value: string) {
    const url = new URL(page.url);
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
    goto(`?${url.searchParams}`, { replaceState: true, keepFocus: true, noScroll: true });
  }

  let copied = $state(false);
  function copyInstall(id: string) {
    navigator.clipboard.writeText(`flatpak install omapak ${id}`);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }
</script>

<svelte:head>
  <title>Apps · Omapak</title>
  <meta
    name="description"
    content="Every app, one remote: omapak-hosted flatpaks graded on their merits plus the full flathub catalog, served and cached by omapak."
  />
</svelte:head>

<section class="pb-16 pt-10">
  <div class="flex flex-wrap items-end justify-between gap-3">
    <div>
      <p class="font-mono text-xs uppercase tracking-[0.2em] text-ink-dim">the store</p>
      <h1 class="mt-2 text-3xl leading-tight text-fg sm:text-4xl">
        Every app. <span class="text-accent">One remote.</span>
      </h1>
    </div>
    {#if !$apps.isPending && !$apps.isError}
      <p class="font-mono text-xs text-ink-dim">
        <span class="text-muted">{omapakCount}</span> omapak hosted ·
        <span class="text-muted">{flathubCount}</span> flathub, cached by us
      </p>
    {/if}
  </div>

  <!-- Featured hero -->
  {#if $featured.data?.app_id && !q && !category && source !== "flathub" && $heroDetail.data}
    <div class="mt-8 grid grid-cols-1 gap-6 rounded-sm border border-accent-border bg-card p-6 shadow-[var(--theme-shadow-1)] lg:grid-cols-[1fr_auto]">
      <div class="flex min-w-0 items-start gap-5">
        <div
          class="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-raised"
        >
          {#if $heroDetail.data.icon}
            <img
              src={$heroDetail.data.icon}
              alt=""
              class="h-full w-full object-contain"
              onerror={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          {:else}
            <span class="font-mono text-2xl font-bold text-accent">{$heroDetail.data.name[0]}</span>
          {/if}
        </div>
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-3">
            <p class="font-mono text-[10px] uppercase tracking-[0.15em] text-accent">featured</p>
            {#if $heroDetail.data.rating}
              <span class="flex items-center gap-1.5 font-mono text-xs text-muted">
                <RatingStars value={$heroDetail.data.rating.average} />
                {$heroDetail.data.rating.average.toFixed(1)}</span
              >
            {/if}
          </div>
          <a href="/app/{$heroDetail.data.app_id}" class="mt-1 block text-2xl font-semibold text-fg hover:text-accent">
            {$heroDetail.data.name}
          </a>
          <p class="mt-2 max-w-2xl leading-relaxed text-muted">{$heroDetail.data.summary}</p>
          <div class="mt-3 flex flex-wrap items-center gap-2 font-mono text-xs">
            <span class="rounded-sm border border-line-subtle bg-panel px-2 py-0.5 text-muted">
              {CATEGORY_LABELS[$heroDetail.data.category]}
            </span>
            {#if $heroDetail.data.source === "omapak"}
              <VerdictBadge verdict={$heroDetail.data.verdict ?? "unpublished"} certified={$heroDetail.data.certified} />
              {#if $heroDetail.data.advisory_average !== undefined}
                <span class="text-accent" title="agent-judge advisory average"
                  >judge {$heroDetail.data.advisory_average.toFixed(1)}/5</span
                >
              {/if}
            {/if}
          </div>
        </div>
      </div>
      <div class="flex flex-col justify-center gap-3 lg:w-64">
        <button
          onclick={() => copyInstall($heroDetail.data!.app_id)}
          class="flex items-center justify-center gap-2 rounded-sm border border-accent-border bg-accent-soft px-4 py-3 font-mono text-sm text-accent transition-colors hover:bg-accent hover:text-surface"
        >
          {#if copied}<Check size={16} /> copied{:else}<Copy size={16} /> flatpak install omapak {$heroDetail.data.app_id}{/if}
        </button>
        <a
          href="/app/{$heroDetail.data.app_id}"
          class="rounded-sm border border-line px-4 py-3 text-center font-mono text-sm text-muted transition-colors hover:border-line-strong hover:text-fg"
        >
          view app →</a
        >
        <p class="text-center font-mono text-[10px] text-ink-dim">{$featured.data?.reason}</p>
      </div>
    </div>
  {/if}

  <!-- Controls -->
  <div class="mt-10 flex flex-wrap items-center gap-3 border-t border-line pt-6">
    <input
      type="search"
      value={q}
      oninput={(e) => setParam("q", (e.target as HTMLInputElement).value)}
      placeholder="search {omapakCount + flathubCount} apps…"
      class="w-64 max-w-full rounded-sm border border-line bg-input px-3 py-2 font-mono text-sm text-fg placeholder:text-ink-dim focus:border-line-strong focus:outline-none"
    />
    <div class="flex overflow-hidden rounded-sm border border-line font-mono text-xs">
      {#each ["all", "omapak", "flathub"] as s (s)}
        <button
          onclick={() => setParam("source", s === "all" ? "" : s)}
          class="px-3 py-2 transition-colors {source === s
            ? 'bg-accent-soft text-accent'
            : 'text-muted hover:text-fg'}"
        >
          {s}
        </button>
      {/each}
    </div>
  </div>

  <!-- Category chips -->
  {#if $apps.data?.categories?.length}
    <div class="mt-4 flex flex-wrap gap-2">
      <button
        onclick={() => setParam("category", "")}
        class="rounded-sm border px-2.5 py-1 font-mono text-xs transition-colors {category
          ? 'border-line-subtle text-muted hover:border-line hover:text-fg'
          : 'border-accent-border bg-accent-soft text-accent'}"
      >
        all
      </button>
      {#each $apps.data.categories as c (c.id)}
        <button
          onclick={() => setParam("category", category === c.id ? "" : c.id)}
          class="rounded-sm border px-2.5 py-1 font-mono text-xs transition-colors {category === c.id
            ? 'border-accent-border bg-accent-soft text-accent'
            : 'border-line-subtle text-muted hover:border-line hover:text-fg'}"
        >
          {c.label} <span class="text-ink-dim">{c.count}</span>
        </button>
      {/each}
    </div>
  {/if}

  <!-- Grid -->
  {#if $apps.isPending}
    <p class="mt-8 font-mono text-sm text-muted">loading the store…</p>
  {:else if $apps.isError}
    <p class="mt-8 font-mono text-sm text-danger">the store failed to load</p>
  {:else if filtered.length === 0}
    <p class="mt-8 max-w-[var(--read-width)] text-muted">
      Nothing matches{q ? ` “${q}”` : ""}{category ? ` in ${CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] ?? category}` : ""}.
      <button onclick={() => { setParam("q", ""); setParam("category", ""); }} class="text-accent underline underline-offset-4">clear filters</button>.
    </p>
  {:else}
    <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each filtered as app (app.app_id)}
        <AppCard {app} />
      {/each}
    </div>
    {#if filtered.length < ($apps.data?.total ?? 0)}
      <p class="mt-6 font-mono text-xs text-ink-dim">
        showing {filtered.length} of {$apps.data?.total} — refine the search to narrow further.
      </p>
    {/if}
  {/if}
</section>
