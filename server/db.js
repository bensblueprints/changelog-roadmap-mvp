const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

function nativeBindingPath() {
  // Under Electron the Node-ABI binding won't load; use the vendored Electron prebuild.
  if (!process.versions.electron) return null;
  const p = path.join(__dirname, '..', 'vendor', 'better_sqlite3-electron.node');
  return fs.existsSync(p) ? p : null;
}

function openDb(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const nativeBinding = nativeBindingPath();
  const db = new Database(path.join(dataDir, 'shipnotes.db'), nativeBinding ? { nativeBinding } : {});
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      body_md TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',          -- JSON array: New | Improved | Fixed
      status TEXT NOT NULL DEFAULT 'draft',     -- draft | published
      published_at TEXT DEFAULT NULL,
      notified INTEGER NOT NULL DEFAULT 0,      -- email blast sent
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      token TEXT NOT NULL UNIQUE,               -- unsubscribe token
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      unsubscribed_at TEXT DEFAULT NULL
    );
    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      email TEXT DEFAULT NULL,                  -- optional submitter email
      visitor_token TEXT DEFAULT NULL,          -- who submitted
      status TEXT NOT NULL DEFAULT 'pending',   -- pending | open | planned | in_progress | shipped | declined | merged
      decline_reason TEXT DEFAULT NULL,
      merged_into INTEGER DEFAULT NULL REFERENCES requests(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
      visitor_token TEXT NOT NULL,
      email TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(request_id, visitor_token)
    );
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
      author TEXT NOT NULL DEFAULT 'Anonymous',
      body TEXT NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0,
      visitor_token TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status, published_at);
    CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
    CREATE INDEX IF NOT EXISTS idx_votes_request ON votes(request_id);
    CREATE INDEX IF NOT EXISTS idx_comments_request ON comments(request_id);
  `);

  return db;
}

const DEFAULT_SETTINGS = {
  site_name: 'Shipnotes',
  site_tagline: "What's new and what's next",
  site_url: '',            // public base URL, used in RSS + unsubscribe links
  accent: '#6366f1',
  smtp_host: '',
  smtp_port: '587',
  smtp_secure: '0',
  smtp_user: '',
  smtp_pass: '',
  smtp_from: ''
};

function getSettings(db) {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const s = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.key in s) s[r.key] = r.value;
  return s;
}

function setSettings(db, patch) {
  const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  const tx = db.transaction(() => {
    for (const [k, v] of Object.entries(patch)) {
      if (k in DEFAULT_SETTINGS) stmt.run(k, String(v ?? ''));
    }
  });
  tx();
}

function slugify(title) {
  return String(title).toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'post';
}

function uniqueSlug(db, title, excludeId = null) {
  const base = slugify(title);
  let slug = base;
  let n = 2;
  const q = excludeId
    ? db.prepare('SELECT 1 FROM posts WHERE slug = ? AND id != ?')
    : db.prepare('SELECT 1 FROM posts WHERE slug = ?');
  while (excludeId ? q.get(slug, excludeId) : q.get(slug)) slug = `${base}-${n++}`;
  return slug;
}

module.exports = { openDb, getSettings, setSettings, DEFAULT_SETTINGS, slugify, uniqueSlug };
