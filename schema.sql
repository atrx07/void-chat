-- ============================================================
-- void.chat — D1 Database Schema
-- Run: wrangler d1 execute voidchat-db --file=schema.sql
-- ============================================================

-- Chat messages (rolling 200-message window)
CREATE TABLE IF NOT EXISTS messages (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  uid          TEXT    NOT NULL,               -- Firebase UID
  display_name TEXT    NOT NULL,               -- Snapshot of name at send time
  message      TEXT    NOT NULL,
  created_at   INTEGER NOT NULL,               -- Unix ms
  type         TEXT    NOT NULL DEFAULT 'chat' -- 'chat' | 'announce' | 'system'
);

-- Banned users (by Firebase UID)
CREATE TABLE IF NOT EXISTS banned_users (
  uid        TEXT    NOT NULL UNIQUE,
  banned_at  INTEGER NOT NULL
);

-- Online presence (upserted every ~15s while connected)
CREATE TABLE IF NOT EXISTS online_users (
  uid          TEXT    NOT NULL UNIQUE,
  display_name TEXT    NOT NULL,
  last_seen    INTEGER NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_id   ON messages (id);
CREATE INDEX IF NOT EXISTS idx_online_seen   ON online_users (last_seen);
