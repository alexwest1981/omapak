/**
 * The v1 contract. The website (web/src/lib/api/types.ts) and the future
 * desktop app both consume these exact shapes from api.omapak.org; drift is
 * caught by scripts/e2e.mjs asserting field names against live responses.
 * Field naming follows the existing catalog (snake_case app_id etc.) so
 * omapak entries pass through unchanged.
 */

export type AppSource = "omapak" | "flathub";

/** Canonical category ids — a fixed taxonomy, flathub/appstream-shaped. */
export type CategoryId =
  | "audiovideo"
  | "development"
  | "education"
  | "game"
  | "graphics"
  | "network"
  | "office"
  | "science"
  | "settings"
  | "system"
  | "utility";

export interface Rating {
  average: number; // 1..5, one decimal
  count: number;
}

export interface AppSummary {
  app_id: string;
  source: AppSource;
  name: string;
  summary: string;
  icon: string | null;
  developer: string | null;
  license: string | null;
  category: CategoryId;
  tags: string[];
  rating: Rating | null; // community reviews; null when unrated
  /** omapak-only fields (undefined for flathub entries). */
  verdict?: "published" | "build_failed" | "unpublished";
  certified?: boolean;
  advisory_average?: number; // agent-judge advisory mean, 0..5
  report_available?: boolean;
}

export interface AppDetail extends AppSummary {
  description?: string | string[] | null;
  homepage?: string | null;
  source_repo?: string | null;
  bugtracker?: string | null;
  screenshots?: string[];
  install: string; // "flatpak install omapak <app_id>"
  report_url?: string | null; // public judge report, when available
}

export interface Review {
  id: number;
  app_id: string;
  user_id: number; // lets clients flag the viewer's own review for edit/delete
  rating: number; // 1..5
  body: string;
  created_at: string; // ISO 8601, UTC
  updated_at: string;
  author: { display_name: string };
}

export interface Me {
  id: number;
  email: string;
  display_name: string;
  created_at: string;
}

export interface CategoryCount {
  id: CategoryId;
  label: string;
  count: number;
}

export interface Featured {
  app_id: string;
  reason: string;
}

/* ── Input shapes (R2 objects, produced by web/scripts/*) ────────────────── */

/** Mirrors web/src/lib/report.ts CatalogEntry (R2 data/catalog.json). */
export interface CatalogEntry {
  app_id: string;
  name?: string | null;
  icon?: string | null;
  developer?: string | null;
  summary: string;
  tags: string[];
  verdict?: "published" | "build_failed" | "unpublished";
  certified?: boolean;
  advisory_average?: number;
  report_available?: boolean;
  description?: string | string[] | null;
  homepage?: string | null;
  source_repo?: string | null;
  bugtracker?: string | null;
  screenshots?: string[];
  license?: string | null;
  source_access?: "public" | "proprietary";
}

export interface Catalog {
  generated_at: string;
  entries: CatalogEntry[];
}

/** Flathub index entry (R2 data/flathub.json); categories captured by the
 * index builder from flathub's appstream API. */
export interface FlathubEntry {
  app_id: string;
  name: string;
  summary: string;
  icon: string | null;
  license: string | null;
  categories?: string[];
}

export interface FlathubIndex {
  generated_at: string;
  apps: FlathubEntry[];
}

export interface UserRow {
  id: number;
  email: string;
  display_name: string;
  created_at: string;
  last_login_at: string | null;
}
