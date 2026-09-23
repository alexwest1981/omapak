<script lang="ts">
  import { page } from "$app/state";
  import { queryClient } from "$lib/api/queryClient";
  import { useMe } from "$lib/api/queries";

  // Landing after the API's /v1/auth/verify redirect: the session cookie is
  // set, so refetch /v1/me and confirm. ?error=invalid means a bad/expired
  // magic link.
  const failed = $derived(page.url.searchParams.get("error") === "invalid");
  const me = useMe();

  queryClient.invalidateQueries({ queryKey: ["me"] });
</script>

<svelte:head>
  <title>Sign-in · Omapak</title>
</svelte:head>

<section class="flex min-h-[50vh] items-center justify-center py-16">
  <div class="w-full max-w-md rounded-sm border border-line bg-card p-8 text-center shadow-[var(--theme-shadow-1)]">
    {#if failed}
      <p class="font-mono text-xs uppercase tracking-[0.15em] text-danger">sign-in failed</p>
      <h1 class="mt-2 text-2xl text-fg">That link didn't work</h1>
      <p class="mt-3 text-sm leading-relaxed text-muted">
        Magic links work once and expire after 15 minutes. Request a fresh one and try again.
      </p>
    {:else if $me.isPending}
      <p class="font-mono text-sm text-muted">signing you in…</p>
    {:else if $me.data}
      <p class="font-mono text-xs uppercase tracking-[0.15em] text-success">signed in</p>
      <h1 class="mt-2 text-2xl text-fg">Welcome, {$me.data.display_name}</h1>
      <p class="mt-3 text-sm text-muted">You can review apps now. Be honest — it's a public report.</p>
    {:else}
      <p class="font-mono text-xs uppercase tracking-[0.15em] text-ink-dim">sign-in</p>
      <h1 class="mt-2 text-2xl text-fg">Almost there</h1>
      <p class="mt-3 text-sm text-muted">
        If this page doesn't show you as signed in within a few seconds, request a new link.
      </p>
    {/if}

    <div class="mt-6 flex justify-center gap-3">
      <a
        href="/apps"
        class="rounded-sm border border-accent-border bg-accent-soft px-4 py-2.5 font-mono text-sm text-accent transition-colors hover:bg-accent hover:text-surface"
      >
        browse the store →</a
      >
      <a
        href="/"
        class="rounded-sm border border-line px-4 py-2.5 font-mono text-sm text-muted transition-colors hover:border-line-strong hover:text-fg"
      >
        home</a
      >
    </div>
  </div>
</section>
