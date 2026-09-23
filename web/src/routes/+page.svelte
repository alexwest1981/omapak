<script lang="ts">
  import { useCatalog, useFlathub } from "$lib/queries";
  import VerdictBadge from "$lib/components/VerdictBadge.svelte";

  const catalog = useCatalog();
  const flathub = useFlathub();
  const omapakEntries = $derived($catalog.data?.entries ?? []);

  const hostedCount = $derived(omapakEntries.length);
  const flathubCount = $derived($flathub.data?.apps.length ?? 0);
  const reportCount = $derived(
    omapakEntries.filter((e) => e.report_available).length,
  );

  // Newest commit first; undated entries keep their catalog order at the end.
  const fresh = $derived(
    [...omapakEntries]
      .sort((a, b) =>
        (b.last_commit_date ?? "").localeCompare(a.last_commit_date ?? ""),
      )
      .slice(0, 3),
  );
</script>

<svelte:head>
  <title>Omapak · the open flatpak store</title>
  <meta
    name="description"
    content="Omapak grades the app on its own merits. One remote for omapak apps and the entire flathub catalog — every submission scored by an open agent judge, every report public."
  />
</svelte:head>

<section class="py-14">
  <p class="font-mono text-xs uppercase tracking-[0.15em] text-ink-dim">
    the open flatpak store
  </p>
  <h1 class="mt-3 max-w-3xl text-4xl leading-tight sm:text-5xl">
    Grade the app on its own <span class="text-accent">merits</span>.
  </h1>
  <p class="mt-5 max-w-[var(--read-width)] text-lg text-muted">
    Normal people don't care how an app was built if it works well and fits their
    needs. Omapak takes that seriously. One remote gets you everything: omapak apps plus
    the entire flathub catalog, served and cached by us. Every submission gets scored by an
    <a
      href="/rubric"
      class="text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
      >agent judge</a
    >
    we build in the open, every report is
    <a
      href="/rubric"
      class="text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
      >public</a
    >, and a human makes the merge call. Scored, published, never gatekept. That's
    the difference between a store and a gatekeeper.
  </p>
  <div class="mt-8 flex flex-wrap items-center gap-3">
    <a
      href="/apps"
      class="rounded-sm border border-accent-border bg-accent-soft px-4 py-2.5 font-mono text-sm text-accent transition-colors hover:bg-accent hover:text-surface"
    >
      browse the store →</a
    >
    <a
      href="/submit"
      class="rounded-sm border border-line px-4 py-2.5 font-mono text-sm text-muted transition-colors hover:border-line-strong hover:text-fg"
    >
      submit an app</a
    >
    <code
      class="rounded-sm border border-line bg-raised px-4 py-2.5 font-mono text-sm text-fg shadow-[var(--theme-shadow-1)]"
    >
      curl -fsSL https://omapak.org/omapak.sh | sh</code
    >
  </div>
</section>

<section class="border-t border-line py-10">
  <div
    class="grid grid-cols-1 gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-3"
  >
    <div class="bg-panel px-5 py-4">
      <p class="font-mono text-xs uppercase tracking-[0.15em] text-ink-dim">
        omapak apps hosted
      </p>
      <p class="mt-2 font-mono text-2xl text-fg">
        {$catalog.isPending || $catalog.isError ? "—" : hostedCount}
      </p>
    </div>
    <div class="bg-panel px-5 py-4">
      <p class="font-mono text-xs uppercase tracking-[0.15em] text-ink-dim">
        flathub apps · one remote away
      </p>
      <p class="mt-2 font-mono text-2xl text-fg">
        {$flathub.isPending || $flathub.isError ? "—" : flathubCount}
      </p>
      {#if $flathub.isError}
        <p class="mt-1 font-mono text-xs text-ink-dim">
          flathub index unavailable right now; omapak-hosted apps are unaffected.
        </p>
      {/if}
    </div>
    <div class="bg-panel px-5 py-4">
      <p class="font-mono text-xs uppercase tracking-[0.15em] text-ink-dim">
        public judge reports
      </p>
      <p class="mt-2 font-mono text-2xl text-fg">
        {$catalog.isPending || $catalog.isError ? "—" : reportCount}
      </p>
    </div>
  </div>
</section>

<section class="border-t border-line py-10">
  <h2 class="font-mono text-sm uppercase tracking-[0.15em] text-ink-dim">
    how it works
  </h2>
  <div class="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_20rem]">
    <ol class="space-y-6">
      <li class="flex gap-4">
        <span class="font-mono text-sm text-accent">01</span>
        <div>
          <p class="text-sm font-medium text-fg">submit a pull request</p>
          <p class="mt-1 max-w-[var(--read-width)] text-sm text-muted">
            Anyone can propose an app — open a PR with the manifest. No pitch, no account
            to charm, no gatekeeper's ear.
          </p>
        </div>
      </li>
      <li class="flex gap-4">
        <span class="font-mono text-sm text-accent">02</span>
        <div>
          <p class="text-sm font-medium text-fg">the agent judge scores it</p>
          <p class="mt-1 max-w-[var(--read-width)] text-sm text-muted">
            An agent judge we build in the open builds, installs, and grades the app
            against a
            <a
              href="/rubric"
              class="text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
              >public rubric</a
            >. The report is published as-is, every time.
          </p>
        </div>
      </li>
      <li class="flex gap-4">
        <span class="font-mono text-sm text-accent">03</span>
        <div>
          <p class="text-sm font-medium text-fg">a human merges</p>
          <p class="mt-1 max-w-[var(--read-width)] text-sm text-muted">
            A person reads the report and makes the merge call, with reasons stated in
            public. Nothing lands on vibes.
          </p>
        </div>
      </li>
    </ol>
    <div
      class="h-fit rounded-sm border border-line bg-card px-4 py-3.5 shadow-[var(--theme-shadow-1)]"
    >
      <p class="font-mono text-xs uppercase tracking-[0.15em] text-ink-dim">
        hard gates
      </p>
      <ul class="mt-3 space-y-1.5 font-mono text-sm text-muted">
        <li>builds and installs</li>
        <li>not hostile to the user</li>
        <li>packaging ≥ 2/5</li>
      </ul>
      <p class="mt-3 text-sm leading-relaxed text-muted">
        Clear these three or it doesn't ship. Everything past them is judged on the merits.
      </p>
    </div>
  </div>
</section>

<section class="border-t border-line py-10">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <h2 class="font-mono text-sm uppercase tracking-[0.15em] text-ink-dim">
      fresh in the store
    </h2>
    <a
      href="/apps"
      class="font-mono text-xs text-muted transition-colors hover:text-accent"
    >
      browse all →</a
    >
  </div>

  {#if $catalog.isPending}
    <p class="mt-8 font-mono text-sm text-muted">loading catalog…</p>
  {:else if $catalog.isError}
    <p class="mt-8 font-mono text-sm text-danger">catalog failed to load</p>
  {:else if fresh.length === 0}
    <p class="mt-8 max-w-[var(--read-width)] text-muted">
      Nothing hosted here yet. The queue is open.
      <a href="/submit" class="text-accent">Be the first</a>.
    </p>
  {:else}
    <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each fresh as entry (entry.app_id)}
        <a
          href="/app/{entry.app_id}"
          class="group rounded-sm border border-line bg-card p-5 shadow-[var(--theme-shadow-1)] transition-colors hover:border-line-strong hover:bg-hover"
        >
          <div class="flex items-start gap-3">
            {#if entry.icon}
              <img
                src={entry.icon}
                alt=""
                loading="lazy"
                class="h-10 w-10 shrink-0 rounded-lg border border-line-subtle bg-raised object-contain"
                onerror={(e) => {
                  const el = e.currentTarget as HTMLImageElement;
                  el.remove();
                }}
              />
            {/if}
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-fg group-hover:text-accent">
                {entry.name || entry.app_id}
              </p>
              <p class="font-mono text-xs text-ink-dim">{entry.app_id}</p>
            </div>
            <VerdictBadge verdict={entry.verdict} certified={entry.certified} />
          </div>
          <p class="mt-2 line-clamp-2 text-sm text-muted">{entry.summary}</p>
        </a>
      {/each}
    </div>
  {/if}
</section>

<section class="border-t border-line py-10">
  <div
    class="flex max-w-[var(--read-width)] items-start gap-4 rounded-sm border border-warning/40 bg-card px-4 py-3.5"
  >
    <span class="shrink-0 font-mono text-xs uppercase tracking-[0.15em] text-warning"
      >alpha</span
    >
    <p class="text-sm leading-relaxed text-muted">
      Omapak is in active development. The judge, the catalog, and this site are all being
      <a
        href="https://github.com/outcrop-labs/omapak"
        class="text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
        >built in the open</a
      >
      right now — expect rough edges, moving parts, and the occasional break. The mission is
      settled; everything else is warming up.
    </p>
  </div>
</section>

<section class="border-t border-line py-10">
  <p class="max-w-[var(--read-width)] text-lg text-muted">
    One remote, every app, and a public paper trail for each one. If that's the store you
    want,
    <a
      href="/mission"
      class="text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
      >read the mission →</a
    >
  </p>
</section>
