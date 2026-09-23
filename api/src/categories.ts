import type { CategoryId } from "./types";

/**
 * Fixed taxonomy for the whole store. Flathub entries arrive with real
 * appstream categories; omapak's free-form metadata tags map through TAG_MAP.
 * Canonical mapping lives here (and mirrored client-side for offline fallback
 * in web/src/lib/api/normalize.ts) — the desktop app just consumes
 * /v1/categories and never needs either table.
 */

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  audiovideo: "Audio & Video",
  development: "Development",
  education: "Education",
  game: "Games",
  graphics: "Graphics",
  network: "Network",
  office: "Office & Productivity",
  science: "Science",
  settings: "Settings",
  system: "System",
  utility: "Utilities",
};

export const CATEGORY_IDS = Object.keys(CATEGORY_LABELS) as CategoryId[];

/** omapak metadata tag → category. Unmapped tags fall back to utility. */
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

/** appstream main categories, priority order; first present wins. */
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

export function categorizeByTags(tags: string[]): CategoryId {
  for (const tag of tags) {
    const hit = TAG_MAP[tag.toLowerCase()];
    if (hit) return hit;
  }
  return "utility";
}

export function categorizeByAppstream(categories: string[]): CategoryId {
  const set = new Set(categories);
  for (const [name, id] of APPSTREAM_ORDER) {
    if (set.has(name)) return id;
  }
  return "utility";
}
