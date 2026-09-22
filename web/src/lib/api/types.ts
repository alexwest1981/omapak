// Mirrors api/src/types.ts — the v1 contract served at api.omapak.org.
// Drift is caught by api/scripts/e2e.mjs asserting live response fields.

export type AppSource = "omapak" | "flathub";

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
  average: number;
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
  rating: Rating | null;
  verdict?: "published" | "build_failed" | "unpublished";
  certified?: boolean;
  advisory_average?: number;
  report_available?: boolean;
}

export interface AppDetail extends AppSummary {
  description?: string | string[] | null;
  homepage?: string | null;
  source_repo?: string | null;
  bugtracker?: string | null;
  screenshots?: string[];
  install: string;
  report_url?: string | null;
}

export interface Review {
  id: number;
  app_id: string;
  user_id: number;
  rating: number;
  body: string;
  created_at: string;
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
  /** The big card. */
  hero: string;
  /** Four smaller grid cards under the hero. */
  more: string[];
  reason: string;
}

export interface AppsResponse {
  total: number;
  apps: AppSummary[];
  categories: CategoryCount[];
}

export interface ReviewsResponse {
  app_id: string;
  rating: Rating | null;
  reviews: Review[];
}

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
