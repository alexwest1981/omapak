-- Ref-resolution counters from the repo proxy (repo.omapak.org).
-- The proxy POSTs {app_id} whenever flatpak resolves one of its refs
-- (install or update). Counters are monotonic; popularity math (log-damped)
-- happens at read time. Attribution to a catalog/flathub app is done by the
-- API, so bogus ids can't create rows here.
CREATE TABLE installs (
  app_id      TEXT PRIMARY KEY,        -- flatpak app id
  count       INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  first_at    TEXT NOT NULL DEFAULT (datetime('now')),
  last_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
