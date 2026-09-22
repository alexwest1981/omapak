-- omapak-api v1: users, magic-link auth, reviews.
-- Timestamps are UTC via sqlite datetime('now'), normalized to ISO 8601 in
-- responses (see src/util.ts).

CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,          -- lowercased
  display_name  TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

-- Magic-link tokens: stored hashed (sha256, hex). Single-use, 15 min TTL.
CREATE TABLE magic_tokens (
  token_hash TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  used_at    TEXT,
  expires_at TEXT NOT NULL
);
CREATE INDEX idx_magic_tokens_email ON magic_tokens(email, created_at);

-- One row per (email, ip) request; the request endpoint counts recent rows
-- to throttle link-generation spam before it reaches the mail provider.
CREATE TABLE auth_requests (
  email      TEXT NOT NULL,
  ip         TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_auth_requests_email_time ON auth_requests(email, created_at);
CREATE INDEX idx_auth_requests_ip_time ON auth_requests(ip, created_at);

CREATE TABLE reviews (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id     TEXT NOT NULL,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (app_id, user_id)
);
CREATE INDEX idx_reviews_app ON reviews(app_id, created_at DESC);
