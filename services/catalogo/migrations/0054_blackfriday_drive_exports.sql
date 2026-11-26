
-- Durable idempotency for owner-authorized exports. No OAuth secrets in D1.
CREATE TABLE IF NOT EXISTS blackfriday_drive_lock (
  root_id TEXT PRIMARY KEY, lease_token TEXT NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS blackfriday_drive_exports (
  root_id TEXT NOT NULL,
  sha256 TEXT NOT NULL CHECK(length(sha256)=64),
  drive_file_id TEXT NOT NULL UNIQUE,
  folder_id TEXT NOT NULL,
  PRIMARY KEY(root_id, sha256)
);
