import type { Context } from "hono";
import type { Env, } from "./env";
import type { UserRow } from "./types";
import { base64url, sha256hex, timingSafeEqual } from "./util";

/**
 * Email magic-link accounts. No passwords ever. Flow:
 *   POST /v1/auth/magic-link {email}  → 202, single-use link (15 min TTL)
 *                                      emailed via Resend; dev mode returns it
 *   GET  /v1/auth/verify?token=…      → sets session cookie, redirects to the
 *                                      SPA (/auth/callback)
 *
 * Sessions: stateless HS256 JWT, 7-day expiry, issued as the oma_session
 * httpOnly cookie (SameSite=None so the SPA on omapak.org can send it to
 * api.omapak.org) and equally accepted as Authorization: Bearer — that is the
 * forward-compatible path for the desktop app.
 */

const SESSION_COOKIE = "oma_session";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const MAGIC_TTL_MINUTES = 15;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── JWT (HS256 via Web Crypto) ─────────────────────────────────────────────

interface SessionClaims {
  sub: number;
  iat: number;
  exp: number;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signSession(env: Env, userId: number): Promise<string> {
  const claims: SessionClaims = {
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const head = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(claims));
  const signingInput = `${head}.${body}`;
  const sig = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(env.SESSION_SECRET),
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${base64url(sig)}`;
}

async function verifySessionToken(env: Env, token: string): Promise<SessionClaims | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [head, body, sig] = parts as [string, string, string];
  const expected = await crypto.subtle
    .sign("HMAC", await hmacKey(env.SESSION_SECRET), new TextEncoder().encode(`${head}.${body}`))
    .then(base64url);
  if (!timingSafeEqual(sig, expected)) return null;
  try {
    const claims = JSON.parse(atob(body.replace(/-/g, "+").replace(/_/g, "/"))) as SessionClaims;
    if (typeof claims.sub !== "number" || claims.exp * 1000 < Date.now()) return null;
    return claims;
  } catch {
    return null;
  }
}

// ── Cookie / bearer extraction ─────────────────────────────────────────────

function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

export function sessionCookieHeader(env: Env, token: string): string {
  return [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "Max-Age=604800",
    "HttpOnly",
    "Secure",
    "SameSite=None",
  ].join("; ");
}

function clearedCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None`;
}

/** Current user from the session cookie or bearer token; null when signed out. */
export async function currentUser(c: Context, env: Env): Promise<UserRow | null> {
  let token = readCookie(c.req.header("cookie"), SESSION_COOKIE);
  const auth = c.req.header("authorization");
  if (!token && auth?.startsWith("Bearer ")) token = auth.slice(7).trim();
  if (!token) return null;

  const claims = await verifySessionToken(env, token);
  if (!claims) return null;
  const row = await env.DB.prepare("SELECT id, email, display_name, created_at, last_login_at FROM users WHERE id = ?1")
    .bind(claims.sub)
    .first<UserRow>();
  return row ?? null;
}

// ── Magic links ────────────────────────────────────────────────────────────

const LINK_WINDOW_MINUTES = 15;
const MAX_LINKS_PER_EMAIL = 5;
const MAX_LINKS_PER_IP = 20;

async function recentlyRequested(db: D1Database, column: "email" | "ip", value: string): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM auth_requests
       WHERE ${column} = ?1 AND created_at > datetime('now', '-${LINK_WINDOW_MINUTES} minutes')`,
    )
    .bind(value)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function requestMagicLink(c: Context, env: Env): Promise<Response> {
  let email: unknown;
  try {
    ({ email } = (await c.req.json()) as { email?: unknown });
  } catch {
    return Response.json({ error: "invalid json body" }, { status: 400 });
  }
  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return Response.json({ error: "a valid email address is required" }, { status: 400 });
  }
  const normalizedEmail = email.trim().toLowerCase();

  const ip = c.req.header("cf-connecting-ip") ?? "";
  if ((await recentlyRequested(env.DB, "email", normalizedEmail)) >= MAX_LINKS_PER_EMAIL) {
    return Response.json({ error: "too many sign-in requests — check your inbox or retry in 15 minutes" }, { status: 429 });
  }
  if (ip && (await recentlyRequested(env.DB, "ip", ip)) >= MAX_LINKS_PER_IP) {
    return Response.json({ error: "too many sign-in requests from this address" }, { status: 429 });
  }
  await env.DB.prepare("INSERT INTO auth_requests (email, ip) VALUES (?1, ?2)").bind(normalizedEmail, ip).run();

  const token = base64url(crypto.getRandomValues(new Uint8Array(32)));
  await env.DB.prepare(
    "INSERT INTO magic_tokens (token_hash, email, expires_at) VALUES (?1, ?2, datetime('now', ?3))",
  )
    .bind(await sha256hex(token), normalizedEmail, `+${MAGIC_TTL_MINUTES} minutes`)
    .run();

  const origin = env.API_ORIGIN || new URL(c.req.url).origin;
  const verifyUrl = `${origin}/v1/auth/verify?token=${token}`;

  if (env.RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: [normalizedEmail],
        subject: "Your Omapak sign-in link",
        html: magicLinkEmail(verifyUrl),
      }),
    });
    if (!res.ok) {
      return Response.json({ error: "mail provider rejected the send — try again shortly" }, { status: 502 });
    }
    return Response.json({ ok: true }, { status: 202 });
  }

  if (env.ALLOW_DEV_LINKS === "1") {
    // Local dev only (no RESEND_API_KEY configured): log it and hand it back
    // so the whole auth → review flow is testable without mail infra.
    console.log(`[dev] magic link for ${normalizedEmail}: ${verifyUrl}`);
    return Response.json({ ok: true, dev_link: verifyUrl }, { status: 202 });
  }
  return Response.json({ error: "email delivery is not configured" }, { status: 503 });
}

function magicLinkEmail(verifyUrl: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f2f0eb;font-family:sans-serif;color:#1b1917">
  <div style="max-width:34rem;margin:0 auto;padding:2.5rem 1.5rem">
    <p style="font-family:monospace;font-size:0.75rem;letter-spacing:0.15em;text-transform:uppercase;color:#8a8378">omapak</p>
    <h1 style="font-size:1.25rem;margin:0.5rem 0 1rem">Sign in to Omapak</h1>
    <p style="line-height:1.6;color:#6e675d">Click the button below to sign in. The link works once and expires in ${MAGIC_TTL_MINUTES} minutes.</p>
    <p style="margin:1.75rem 0">
      <a href="${verifyUrl}" style="display:inline-block;background:#8f7a33;color:#ffffff;text-decoration:none;padding:0.75rem 1.25rem;border-radius:2px;font-family:monospace;font-size:0.9rem">sign in →</a>
    </p>
    <p style="line-height:1.6;color:#6e675d;font-size:0.85rem">If the button doesn't work, paste this into your browser:<br><a href="${verifyUrl}" style="color:#8f7a33;word-break:break-all">${verifyUrl}</a></p>
    <p style="line-height:1.6;color:#6e675d;font-size:0.85rem">Didn't request this? Ignore the email — nothing happens unless you click.</p>
  </div>
</body></html>`;
}

export async function verifyMagicLink(c: Context, env: Env): Promise<Response> {
  const token = c.req.query("token") ?? "";
  const fail = () => Response.redirect(`${env.SITE_ORIGIN}/auth/callback?error=invalid`, 302);

  const tokenHash = await sha256hex(token);
  const row = await env.DB.prepare(
    "SELECT email FROM magic_tokens WHERE token_hash = ?1 AND used_at IS NULL AND expires_at > datetime('now')",
  )
    .bind(tokenHash)
    .first<{ email: string }>();
  if (!row) return fail();

  const claimed = await env.DB.prepare(
    "UPDATE magic_tokens SET used_at = datetime('now') WHERE token_hash = ?1 AND used_at IS NULL",
  )
    .bind(tokenHash)
    .run();
  if (!claimed.meta.changes) return fail();

  const displayName = row.email.split("@")[0]!.slice(0, 40) || "omapak user";
  await env.DB.prepare(
    `INSERT INTO users (email, display_name, last_login_at) VALUES (?1, ?2, datetime('now'))
     ON CONFLICT (email) DO UPDATE SET last_login_at = datetime('now')`,
  )
    .bind(row.email, displayName)
    .run();
  const user = await env.DB.prepare("SELECT id FROM users WHERE email = ?1").bind(row.email).first<{ id: number }>();
  if (!user) return fail();

  const session = await signSession(env, user.id);
  return new Response(null, {
    status: 302,
    headers: {
      location: `${env.SITE_ORIGIN}/auth/callback`,
      "set-cookie": sessionCookieHeader(env, session),
    },
  });
}

export function logoutResponse(): Response {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json", "set-cookie": clearedCookieHeader() },
  });
}
