// One-time Turso migration from Node (terminal).
// Usage: node scripts/migrate.mjs
// Loads env from ./.env via dotenv

import 'dotenv/config';

function normalize(url) {
  if (!url) return '';
  if (url.startsWith('libsql://')) return 'https://' + url.slice('libsql://'.length);
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return 'https://' + url;
}

const BASE_URL = normalize(process.env.EXPO_PUBLIC_TURSO_URL);
function endpoint(path) {
  if (!BASE_URL) return '';
  if (BASE_URL.endsWith('/v1/execute') || BASE_URL.endsWith('/v2/pipeline')) return BASE_URL;
  return BASE_URL.replace(/\/$/, '') + path;
}
const TURSO_TOKEN = process.env.EXPO_PUBLIC_TURSO_TOKEN;

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error('Missing EXPO_PUBLIC_TURSO_URL or EXPO_PUBLIC_TURSO_TOKEN env vars');
  process.exit(1);
}

const statements = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_algo TEXT NOT NULL DEFAULT 'scrypt',
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    device_label TEXT
  )`,
];

async function exec(sql, params = []) {
  const url = endpoint('/v2/pipeline');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TURSO_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests: [{ type: 'execute', stmt: { sql, args: params, want_rows: true } }] }),
  });
  if (!res.ok) throw new Error(`Turso ${res.status}: ${await res.text()}`);
  return res.json();
}

(async () => {
  try {
    for (const sql of statements) {
      await exec(sql);
      console.log('OK:', sql.split('\n')[0]);
    }
    console.log('Migration complete.');
  } catch (e) {
    console.error('Migration failed:', e);
    process.exit(1);
  }
})();
