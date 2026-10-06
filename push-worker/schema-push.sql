-- OPTIONAL. The Worker creates these two tables by itself the first time it runs.
-- Run this only if you prefer to create them yourself (D1 console on mstc-db).
CREATE TABLE IF NOT EXISTS push_sent (
  kind TEXT NOT NULL,            -- 'announcement' | 'event' | 'reminder'
  ref_id INTEGER NOT NULL,       -- announcements.id or events.id
  sent_at TEXT NOT NULL,
  PRIMARY KEY (kind, ref_id)
);
CREATE TABLE IF NOT EXISTS push_state (
  key TEXT PRIMARY KEY,          -- 'initialized', 'fcm_token' (cached Google access token)
  value TEXT NOT NULL
);
