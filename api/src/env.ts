export interface Env {
  DB: D1Database;
  REPO: R2Bucket;

  /** Secrets (`wrangler secret put`). */
  SESSION_SECRET: string; // 32+ random chars; HS256 session signing
  RESEND_API_KEY?: string; // absent => dev-link mode (local only)

  API_ORIGIN: string; // https://api.omapak.org in production; localhost in dev
  SITE_ORIGIN: string; // https://omapak.org in production
  MAIL_FROM: string; // "Omapak <login@omapak.org>"
  ALLOW_DEV_LINKS: string; // "1" local only: magic link in the API response
  EXTRA_ORIGINS?: string; // comma-separated extra CORS origins
}
