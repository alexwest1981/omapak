<script lang="ts">
  import Pencil from "@lucide/svelte/icons/pencil";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import Star from "@lucide/svelte/icons/star";
  import { writable } from "svelte/store";
  import { useMe, useReviews, submitReview, deleteReview } from "$lib/api/queries";
  import { openSignIn } from "$lib/sign-in.svelte";
  import { ApiError } from "$lib/api/client";
  import RatingStars from "./RatingStars.svelte";

  let { appId }: { appId: string } = $props();

  // Re-key queries live if the app id prop changes (param navigation).
  const appIdStore = writable("");
  $effect(() => {
    appIdStore.set(appId);
  });

  const reviews = useReviews(appIdStore);
  const me = useMe();

  const mine = $derived(
    $me.data
      ? ($reviews.data?.reviews ?? []).find((r) => r.user_id === $me.data!.id) ?? null
      : null,
  );

  // Form state — doubles as the edit form when the viewer already reviewed.
  let formOpen = $state(false);
  let rating = $state(0);
  let body = $state("");
  let busy = $state(false);
  let error = $state<string | null>(null);

  function startNew() {
    rating = 0;
    body = "";
    error = null;
    formOpen = true;
  }

  function startEdit() {
    if (!mine) return;
    rating = mine.rating;
    body = mine.body;
    error = null;
    formOpen = true;
  }

  function save(e: SubmitEvent) {
    e.preventDefault();
    if (busy || rating < 1) return;
    busy = true;
    error = null;
    submitReview(appId, { rating, body: body.trim() })
      .then(() => {
        formOpen = false;
      })
      .catch((err) => {
        error = err instanceof ApiError ? err.message : "couldn't reach the review service — try again";
      })
      .finally(() => {
        busy = false;
      });
  }

  function remove() {
    if (!mine || busy) return;
    busy = true;
    deleteReview(appId, mine.id)
      .then(() => {
        formOpen = false;
      })
      .catch((err) => {
        error = err instanceof ApiError ? err.message : "couldn't delete the review — try again";
      })
      .finally(() => {
        busy = false;
      });
  }

  function when(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }
</script>

<section class="mt-10">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <h2 class="font-mono text-sm uppercase tracking-[0.15em] text-ink-dim">reviews</h2>
    {#if $reviews.data?.rating}
      <span class="flex items-center gap-2 font-mono text-xs text-muted">
        <RatingStars value={$reviews.data.rating.average} />
        {$reviews.data.rating.average.toFixed(1)} · {$reviews.data.rating.count}
        {$reviews.data.rating.count === 1 ? "review" : "reviews"}</span
      >
    {/if}
  </div>

  {#if $reviews.isError}
    <p class="mt-4 font-mono text-xs text-ink-dim">
      reviews unavailable right now — the store API is offline.
    </p>
  {:else if $reviews.isPending}
    <p class="mt-4 font-mono text-sm text-muted">loading reviews…</p>
  {:else}
    <!-- Your review / form -->
    {#if $me.data}
      {#if mine && !formOpen}
        <div class="mt-4 rounded-sm border border-accent-border bg-accent-soft/30 p-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="flex items-center gap-2 font-mono text-xs text-muted">
              <RatingStars value={mine.rating} /> your review · {when(mine.updated_at)}
            </span>
            <span class="flex gap-2">
              <button
                onclick={startEdit}
                class="flex items-center gap-1.5 rounded-sm border border-line px-2.5 py-1.5 font-mono text-xs text-muted transition-colors hover:border-line-strong hover:text-fg"
              >
                <Pencil size={12} /> edit</button
              >
              <button
                onclick={remove}
                disabled={busy}
                class="flex items-center gap-1.5 rounded-sm border border-line px-2.5 py-1.5 font-mono text-xs text-muted transition-colors hover:border-danger/60 hover:text-danger disabled:opacity-50"
              >
                <Trash2 size={12} /> delete</button
              >
            </span>
          </div>
          {#if mine.body}<p class="mt-3 text-sm leading-relaxed text-muted">{mine.body}</p>{/if}
        </div>
      {:else if formOpen}
        <form class="mt-4 rounded-sm border border-line bg-card p-5" onsubmit={save}>
          <p class="font-mono text-xs uppercase tracking-wider text-muted">
            {mine ? "edit your review" : "write a review"}
          </p>
          <div class="mt-3 flex items-center gap-1" role="radiogroup" aria-label="Rating">
            {#each [1, 2, 3, 4, 5] as i (i)}
              <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
              <button
                type="button"
                onclick={() => (rating = i)}
                aria-label="{i} star{i > 1 ? 's' : ''}"
                aria-pressed={rating === i}
                class="p-0.5"
              >
                <Star size={20} class={i <= rating ? "fill-current text-accent" : "text-ink-dim"} />
              </button>
            {/each}
          </div>
          <textarea
            bind:value={body}
            rows="4"
            maxlength="4000"
            placeholder="what does it do well? what's rough? (optional)"
            class="mt-4 w-full resize-y rounded-sm border border-line bg-input px-3 py-2.5 text-sm text-fg placeholder:text-ink-dim focus:border-line-strong focus:outline-none"
          ></textarea>
          {#if error}<p class="mt-3 font-mono text-xs text-danger">{error}</p>{/if}
          <div class="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={busy || rating < 1}
              class="rounded-sm border border-accent-border bg-accent-soft px-4 py-2 font-mono text-sm text-accent transition-colors hover:bg-accent hover:text-surface disabled:opacity-50"
            >
              {busy ? "saving…" : mine ? "update review" : "post review"}</button
            >
            <button
              type="button"
              onclick={() => (formOpen = false)}
              class="rounded-sm border border-line px-4 py-2 font-mono text-sm text-muted transition-colors hover:border-line-strong hover:text-fg"
            >
              cancel</button
            >
          </div>
        </form>
      {:else}
        <button
          onclick={startNew}
          class="mt-4 w-full rounded-sm border border-dashed border-line-strong px-4 py-3 font-mono text-sm text-muted transition-colors hover:border-accent-border hover:text-accent"
        >
          + review this app</button
        >
      {/if}
    {:else if !$me.isPending}
      <button
        onclick={openSignIn}
        class="mt-4 w-full rounded-sm border border-dashed border-line-strong px-4 py-3 font-mono text-sm text-muted transition-colors hover:border-accent-border hover:text-accent"
      >
        sign in to review this app</button
      >
    {/if}

    <!-- Everyone's reviews -->
    {#if ($reviews.data?.reviews ?? []).length > 0}
      <div class="mt-6 divide-y divide-line-subtle border-t border-line-subtle">
        {#each $reviews.data.reviews as review (review.id)}
          {#if review.user_id !== $me.data?.id}
            <article class="py-4">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="flex items-center gap-2">
                  <span
                    class="flex h-6 w-6 items-center justify-center rounded-sm bg-raised font-mono text-xs font-bold text-muted"
                  >
                    {review.author.display_name[0]?.toUpperCase() ?? "?"}</span
                  >
                  <span class="font-mono text-xs text-fg">{review.author.display_name}</span>
                </span>
                <span class="flex items-center gap-2 font-mono text-xs text-ink-dim">
                  <RatingStars value={review.rating} />
                  {when(review.created_at)}
                </span>
              </div>
              {#if review.body}
                <p class="mt-2 text-sm leading-relaxed text-muted">{review.body}</p>
              {/if}
            </article>
          {/if}
        {/each}
      </div>
    {:else if !mine}
      <p class="mt-4 text-sm text-muted">No reviews yet. Be the first.</p>
    {/if}
  {/if}
</section>
