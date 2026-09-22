<script lang="ts">
  import X from "@lucide/svelte/icons/x";
  import { signIn, closeSignIn } from "$lib/sign-in.svelte";
  import { requestMagicLink } from "$lib/api/queries";
  import { ApiError } from "$lib/api/client";

  let email = $state("");
  let sending = $state(false);
  let sent = $state(false);
  let devLink = $state<string | null>(null);
  let error = $state<string | null>(null);

  function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!email.trim() || sending) return;
    sending = true;
    error = null;
    requestMagicLink(email.trim())
      .then((res) => {
        sent = true;
        devLink = res.dev_link ?? null;
      })
      .catch((err) => {
        error = err instanceof ApiError ? err.message : "couldn't reach the sign-in service — try again";
      })
      .finally(() => {
        sending = false;
      });
  }

  function reset() {
    email = "";
    sending = false;
    sent = false;
    devLink = null;
    error = null;
  }

  $effect(() => {
    if (!signIn.open) reset();
  });
</script>

{#if signIn.open}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
    <div class="absolute inset-0" onclick={closeSignIn}></div>
    <div
      class="relative w-full max-w-md rounded-sm border border-line bg-card p-6 shadow-[var(--theme-shadow-3)]"
      role="dialog"
      aria-modal="true"
      aria-label="Sign in to Omapak"
    >
      <button
        onclick={closeSignIn}
        aria-label="Close"
        class="absolute right-4 top-4 text-muted transition-colors hover:text-fg"
      >
        <X size={16} />
      </button>

      {#if sent}
        <p class="font-mono text-xs uppercase tracking-[0.15em] text-ink-dim">check your inbox</p>
        <h2 class="mt-2 text-xl text-fg">Sign-in link sent</h2>
        <p class="mt-3 text-sm leading-relaxed text-muted">
          We emailed a sign-in link to <span class="font-mono text-fg">{email}</span>. It works once
          and expires in 15 minutes.
        </p>
        {#if devLink}
          <p class="mt-3 rounded-sm border border-warning/40 bg-panel px-3 py-2 font-mono text-xs leading-relaxed text-warning break-all">
            dev mode: <a href={devLink} class="underline">open sign-in link</a>
          </p>
        {/if}
        <button
          onclick={closeSignIn}
          class="mt-6 w-full rounded-sm border border-line px-4 py-2.5 font-mono text-sm text-muted transition-colors hover:border-line-strong hover:text-fg"
        >
          close</button
        >
      {:else}
        <p class="font-mono text-xs uppercase tracking-[0.15em] text-ink-dim">accounts</p>
        <h2 class="mt-2 text-xl text-fg">Sign in to review apps</h2>
        <p class="mt-3 text-sm leading-relaxed text-muted">
          No passwords. Enter your email, we send a one-time link — that's the whole account.
        </p>
        <form class="mt-5" onsubmit={submit}>
          <label for="signin-email" class="font-mono text-xs uppercase tracking-wider text-muted"
            >email</label
          >
          <input
            id="signin-email"
            type="email"
            required
            bind:value={email}
            placeholder="you@example.com"
            class="mt-2 w-full rounded-sm border border-line bg-input px-3 py-2.5 font-mono text-sm text-fg placeholder:text-ink-dim focus:border-line-strong focus:outline-none"
          />
          {#if error}
            <p class="mt-3 font-mono text-xs text-danger">{error}</p>
          {/if}
          <button
            type="submit"
            disabled={sending || !email.trim()}
            class="mt-5 w-full rounded-sm border border-accent-border bg-accent-soft px-4 py-2.5 font-mono text-sm text-accent transition-colors hover:bg-accent hover:text-surface disabled:opacity-50"
          >
            {sending ? "sending…" : "email me a sign-in link"}</button
          >
        </form>
      {/if}
    </div>
  </div>
{/if}
