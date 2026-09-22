import { derived, readable, type Readable } from "svelte/store";
import { createQuery } from "@tanstack/svelte-query";
import { ApiError, api } from "./client";
import { queryClient } from "./queryClient";
import { countCategories, normalizeFlathub, normalizeOmapak } from "./normalize";
import type {
  AppDetail,
  AppSource,
  AppsResponse,
  Featured,
  Me,
  Review,
  ReviewsResponse,
} from "./types";
import type { Catalog, FlathubIndex } from "$lib/report";

// Query keys can change while a page stays mounted (URL params, featured
// hero resolving) — pass a store so svelte-query re-keys reactively.
function isStore<T>(v: T | Readable<T>): v is Readable<T> {
  return typeof v === "object" && v !== null && "subscribe" in v && typeof (v as Readable<T>).subscribe === "function";
}

function asStore<T>(v: T | Readable<T>): Readable<T> {
  return isStore(v) ? v : readable(v);
}

/* ── Queries ──────────────────────────────────────────────────────────────── */

async function staticApps(source: AppSource | "all"): Promise<AppsResponse> {
  // Offline fallback: normalize the committed static bundles into v1 shape.
  const [catalog, flathub] = await Promise.all([
    fetch("/data/catalog.json", { cache: "no-cache" }).then((r) => r.json() as Promise<Catalog>),
    fetch("/data/flathub.json", { cache: "no-cache" }).then((r) => r.json() as Promise<FlathubIndex>),
  ]);
  const omapak = catalog.entries.map(normalizeOmapak);
  const hosted = new Set(omapak.map((a) => a.app_id));
  const passthrough = flathub.apps
    .filter((a) => !hosted.has(a.app_id))
    .map((a) => normalizeFlathub({ ...a, categories: a.categories ?? [] }));
  const apps = source === "omapak" ? omapak : source === "flathub" ? passthrough : [...omapak, ...passthrough];
  return {
    total: apps.length,
    counts: { omapak: omapak.length, flathub: passthrough.length, all: omapak.length + passthrough.length },
    apps,
    categories: countCategories(apps),
  };
}

export function useApps(source: AppSource | "all" | Readable<AppSource | "all">) {
  // limit=5000: the store filters client-side, so the whole list must land
  // in one response (same payload the old homepage shipped as flathub.json).
  const options = derived(asStore(source), (s) => ({
    queryKey: ["apps", s],
    queryFn: () => api<AppsResponse>(`/v1/apps?source=${s}&limit=5000`).catch(() => staticApps(s)),
    staleTime: 5 * 60 * 1000,
  }));
  return createQuery(options);
}

export function useFeatured() {
  return createQuery({
    queryKey: ["featured"],
    queryFn: () => api<Featured>("/v1/featured").catch(() => null),
    staleTime: 60 * 60 * 1000,
  });
}

async function staticDetail(appId: string): Promise<AppDetail | null> {
  const [catalog, flathub] = await Promise.all([
    fetch("/data/catalog.json", { cache: "no-cache" }).then((r) => r.json() as Promise<Catalog>),
    fetch("/data/flathub.json", { cache: "no-cache" }).then((r) => r.json() as Promise<FlathubIndex>),
  ]);
  const entry = catalog.entries.find((e) => e.app_id === appId);
  if (entry) {
    return {
      ...normalizeOmapak(entry),
      description: entry.description ?? null,
      homepage: entry.homepage ?? null,
      source_repo: entry.source_repo ?? null,
      bugtracker: entry.bugtracker ?? null,
      screenshots: entry.screenshots ?? [],
      install: `flatpak install omapak ${appId}`,
      report_url: entry.report_available ? `https://repo.omapak.org/reports/${appId}.json` : null,
    } satisfies AppDetail;
  }
  const fh = flathub.apps.find((a) => a.app_id === appId);
  if (fh) {
    return {
      ...normalizeFlathub({ ...fh, categories: fh.categories ?? [] }),
      description: null,
      homepage: null,
      source_repo: null,
      bugtracker: null,
      screenshots: [],
      install: `flatpak install omapak ${appId}`,
    } satisfies AppDetail;
  }
  return null;
}

export function useAppDetail(appId: string | Readable<string>) {
  const options = derived(asStore(appId), (id) => ({
    queryKey: ["app", id],
    queryFn: async () => {
      if (!id) return null;
      try {
        return await api<AppDetail>(`/v1/apps/${id}`);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        return staticDetail(id); // API unreachable → static fallback
      }
    },
    staleTime: 5 * 60 * 1000,
  }));
  return createQuery(options);
}

export function useReviews(appId: string | Readable<string>) {
  const options = derived(asStore(appId), (id) => ({
    queryKey: ["reviews", id],
    queryFn: async () => {
      if (!id) return { app_id: id, rating: null, reviews: [] } as ReviewsResponse;
      return api<ReviewsResponse>(`/v1/apps/${id}/reviews?limit=50`);
    },
    staleTime: 60 * 1000,
    retry: 0,
  }));
  return createQuery(options);
}

/** Signed-in user, or null. A 401 is "signed out", not an error. */
export function useMe() {
  return createQuery({
    queryKey: ["me"],
    queryFn: () =>
      api<Me | null>("/v1/me").catch((err) =>
        err instanceof ApiError && err.status === 401 ? null : Promise.reject(err),
      ),
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });
}

/* ── Actions ──────────────────────────────────────────────────────────────── */

export async function requestMagicLink(email: string): Promise<{ ok: boolean; dev_link?: string }> {
  return api<{ ok: boolean; dev_link?: string }>("/v1/auth/magic-link", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function signOut() {
  await api("/v1/auth/logout", { method: "POST" }).catch(() => {});
  queryClient.setQueryData(["me"], null);
}

export async function updateDisplayName(display_name: string) {
  const me = await api<Me>("/v1/me", { method: "PATCH", body: JSON.stringify({ display_name }) });
  queryClient.setQueryData(["me"], me);
}

function invalidateAppCaches(appId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["reviews", appId] }),
    queryClient.invalidateQueries({ queryKey: ["app", appId] }),
    queryClient.invalidateQueries({ queryKey: ["apps"] }),
  ]);
}

export async function submitReview(
  appId: string,
  review: { rating: number; body: string },
): Promise<Review> {
  const saved = await api<Review>(`/v1/apps/${appId}/reviews`, {
    method: "POST",
    body: JSON.stringify(review),
  });
  await invalidateAppCaches(appId);
  return saved;
}

export async function deleteReview(appId: string, reviewId: number) {
  await api(`/v1/reviews/${reviewId}`, { method: "DELETE" });
  await invalidateAppCaches(appId);
}
