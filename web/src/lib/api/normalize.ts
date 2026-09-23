// Offline fallback: when api.omapak.org is unreachable, /apps still renders
// by normalizing the static catalog + flathub index bundles (same files the
// old homepage used) into the v1 AppSummary shape. Ratings are unknown
// offline — the reviews section shows its own unavailable state.
//
// The category mapping mirrors api/src/categories.ts; keep the two in sync.
import type { AppSummary, CategoryCount, CategoryId } from "./types";
import type { CatalogEntry, FlathubEntry } from "$lib/report";
import { CATEGORY_LABELS } from "./types";

const TAG_MAP: Record<string, CategoryId> = {
  audio: "audiovideo",
  music: "audiovideo",
  daw: "audiovideo",
  player: "audiovideo",
  media: "audiovideo",
  video: "audiovideo",
  animation: "audiovideo",
  youtube: "audiovideo",
  development: "development",
  database: "development",
  education: "education",
  game: "game",
  graphics: "graphics",
  network: "network",
  proxy: "network",
  "file-sharing": "network",
  p2p: "network",
  office: "office",
  writing: "office",
  notes: "office",
  health: "science",
  security: "system",
  identity: "system",
};

const APPSTREAM_ORDER: Array<[string, CategoryId]> = [
  ["Game", "game"],
  ["Graphics", "graphics"],
  ["Development", "development"],
  ["Network", "network"],
  ["Office", "office"],
  ["Science", "science"],
  ["Education", "education"],
  ["AudioVideo", "audiovideo"],
  ["Audio", "audiovideo"],
  ["Video", "audiovideo"],
  ["Settings", "settings"],
  ["System", "system"],
  ["Utility", "utility"],
];

function byTags(tags: string[]): CategoryId {
  for (const tag of tags) {
    const hit = TAG_MAP[tag.toLowerCase()];
    if (hit) return hit;
  }
  return "utility";
}

function byAppstream(categories: string[]): CategoryId {
  const set = new Set(categories);
  for (const [name, id] of APPSTREAM_ORDER) {
    if (set.has(name)) return id;
  }
  return "utility";
}

export function normalizeOmapak(entry: CatalogEntry): AppSummary {
  return {
    app_id: entry.app_id,
    source: "omapak",
    name: entry.name || entry.app_id,
    summary: entry.summary,
    icon: entry.icon ?? null,
    developer: entry.developer ?? null,
    license: entry.license ?? null,
    category: byTags(entry.tags ?? []),
    tags: entry.tags ?? [],
    rating: null,
    verdict: entry.verdict ?? "unpublished",
    certified: entry.certified ?? false,
    advisory_average: entry.advisory_average,
    report_available: entry.report_available ?? false,
  };
}

export function normalizeFlathub(entry: FlathubEntry & { categories?: string[] }): AppSummary {
  return {
    app_id: entry.app_id,
    source: "flathub",
    name: entry.name || entry.app_id,
    summary: entry.summary,
    icon: entry.icon ?? null,
    developer: null,
    license: entry.license ?? null,
    category: byAppstream(entry.categories ?? []),
    tags: entry.categories ?? [],
    rating: null,
  };
}

export function countCategories(apps: AppSummary[]): CategoryCount[] {
  const counts = new Map<CategoryId, number>();
  for (const a of apps) counts.set(a.category, (counts.get(a.category) ?? 0) + 1);
  return [...counts.entries()]
    .map(([id, count]) => ({ id, label: CATEGORY_LABELS[id], count }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
}
