<script lang="ts">
  import LogOut from "@lucide/svelte/icons/log-out";
  import { useMe, signOut } from "$lib/api/queries";
  import { openSignIn } from "$lib/sign-in.svelte";
  import SignInDialog from "./SignInDialog.svelte";

  const me = useMe();
  let open = $state(false);
</script>

{#if $me.data}
  <div class="relative">
    <button
      onclick={() => (open = !open)}
      class="flex h-8 items-center gap-2 rounded border border-line-subtle pr-2.5 pl-1 transition-colors hover:border-line-strong"
      aria-label="Account menu"
    >
      <span
        class="flex h-6 w-6 items-center justify-center rounded-sm bg-accent-soft font-mono text-xs font-bold text-accent"
      >
        {$me.data.display_name[0]?.toUpperCase() ?? "?"}</span
      >
      <span class="max-w-24 truncate font-mono text-xs text-muted">{$me.data.display_name}</span>
    </button>
    {#if open}
      <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
      <div class="fixed inset-0 z-40" onclick={() => (open = false)}></div>
      <div
        class="absolute right-0 z-50 mt-2 w-56 rounded-sm border border-line bg-card p-3 shadow-[var(--theme-shadow-2)]"
      >
        <p class="truncate font-mono text-sm text-fg">{$me.data.display_name}</p>
        <p class="mt-0.5 truncate font-mono text-xs text-ink-dim">{$me.data.email}</p>
        <button
          onclick={() => {
            open = false;
            signOut();
          }}
          class="mt-3 flex w-full items-center gap-2 rounded-sm border border-line px-3 py-2 font-mono text-xs text-muted transition-colors hover:border-line-strong hover:text-fg"
        >
          <LogOut size={13} /> sign out
        </button>
      </div>
    {/if}
  </div>
{:else if !$me.isPending}
  <button
    onclick={openSignIn}
    class="rounded-sm border border-accent-border bg-accent-soft px-3 py-1.5 font-mono text-xs text-accent transition-colors hover:bg-accent hover:text-surface"
  >
    sign in</button
  >
{/if}

<SignInDialog />
