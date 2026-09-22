<script lang="ts">
  import "../app.css";
  import { QueryClientProvider } from "@tanstack/svelte-query";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";
  import OmapakMark from "$lib/components/OmapakMark.svelte";
  import AuthMenu from "$lib/components/AuthMenu.svelte";
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import { initTheme } from "$lib/theme.svelte";
  import { queryClient } from "$lib/api/queryClient";

  let { children } = $props();

  const year = new Date().getFullYear();

  $effect(() => {
    initTheme();
  });
</script>

<svelte:head>
  <title>Omapak · the open flatpak store</title>
  <meta
    name="description"
    content="Omapak grades the app on its own merits. Every submission scored by an open agent judge, every report public, never gatekept."
  />
</svelte:head>

<QueryClientProvider client={queryClient}>
  <div class="flex min-h-dvh flex-col">
    <header class="border-b border-line bg-[var(--theme-glass)] backdrop-blur-xl">
      <div
        class="mx-auto flex h-14 w-full max-w-[var(--page-width)] items-center justify-between px-6"
      >
        <a href="/" class="flex items-center gap-2.5">
          <OmapakMark size={20} />
          <span
            class="text-[13px] font-semibold uppercase tracking-[0.18em] text-fg"
          >
            omapak</span
          >
          <span
            class="rounded-sm border border-warning/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-warning"
            title="Omapak is in active development"
          >
            alpha</span
          >
        </a>
        <nav class="flex items-center gap-5 font-mono text-sm">
          <a href="/apps" class="text-muted transition-colors hover:text-fg">apps</a>
          <a href="/mission" class="text-muted transition-colors hover:text-fg">mission</a>
          <a href="/rubric" class="text-muted transition-colors hover:text-fg">rubric</a>
          <a href="/submit" class="text-muted transition-colors hover:text-fg">submit</a>
          <AuthMenu />
          <ThemeToggle />
        </nav>
      </div>
    </header>

    <main class="mx-auto w-full max-w-[var(--page-width)] flex-1 px-6">
      {@render children()}
    </main>

    <footer class="border-t border-line">
      <div
        class="mx-auto flex w-full max-w-[var(--page-width)] flex-col gap-4 px-6 py-5 font-mono text-xs text-ink-dim sm:flex-row sm:items-end sm:justify-between"
      >
        <div class="flex flex-col gap-1.5">
          <span>Omapak · every flatpak, every distro</span>
          <span>one remote · every app · normal people don't care how it was built, neither do we</span>
        </div>
        <div class="flex flex-col gap-1.5 sm:items-end">
          <nav class="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-muted" aria-label="Footer">
            <a
              href="https://outcroplabs.com"
              target="_blank"
              rel="noreferrer"
              class="inline-flex items-center gap-1.5 transition-colors hover:text-fg"
            >
              <ExternalLink size={12} /> Outcrop Labs
            </a>
            <a
              href="https://github.com/outcrop-labs"
              target="_blank"
              rel="noreferrer"
              class="inline-flex items-center gap-1.5 transition-colors hover:text-fg"
            >
              <ExternalLink size={12} /> GitHub
            </a>
          </nav>
          <span>© {year} Outcrop Labs · MIT</span>
        </div>
      </div>
    </footer>
  </div>
</QueryClientProvider>
