// Turso/libsql HTTP client (v2 pipeline preferred, v1 fallback).
// Reads URL/token from EXPO_PUBLIC_*.

function normalize(url: string) {
  if (!url) return '';
  if (url.startsWith('libsql://')) return 'https://' + url.slice('libsql://'.length);
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return 'https://' + url;
}

const RAW_URL = normalize(process.env.EXPO_PUBLIC_TURSO_URL || '');

function baseHost(url: string) {
  if (!url) return '';
  return url
    .replace(/\/?v1\/execute$/, '')
    .replace(/\/?v2\/pipeline$/, '')
    .replace(/\/$/, '');
}

const BASE_HOST = baseHost(RAW_URL);

function endpointV2() {
  if (!BASE_HOST) return '';
  return BASE_HOST + '/v2/pipeline';
}
const TURSO_TOKEN = process.env.EXPO_PUBLIC_TURSO_TOKEN || '';

type ExecResponse = any;

function mapRows(payload: any): { rows: any[] } {
  const unwrap = (v: any) => {
    if (v && typeof v === 'object' && 'type' in v) {
      if (v.type === 'null') return null;
      if ('value' in v) return (v as any).value;
    }
    return v;
  };
  // v2 pipeline result shape
  if (payload && Array.isArray(payload.results)) {
    // Surface any statement error early
    for (const r of payload.results) {
      const err = r?.response?.error || r?.response?.err;
      if (err) throw new Error(typeof err === 'string' ? err : JSON.stringify(err));
    }
    const first = payload.results[0];
    const res = first?.response?.ok?.result ?? first?.response?.result;
    const colsRaw: any[] = res?.columns ?? res?.cols ?? [];
    const cols: string[] = colsRaw.map((c: any) => (typeof c === 'string' ? c : c?.name ?? String(c)));
    const rows: any[] = (res?.rows ?? []).map((arr: any[]) => {
      const obj: any = {};
      for (let i = 0; i < cols.length; i++) obj[cols[i]] = unwrap(arr[i]);
      return obj;
    });
    return { rows };
  }
  // v1 execute result shape
  if (payload && payload.columns && payload.rows) {
    const cols: string[] = (payload.columns as any[]).map((c: any) => (typeof c === 'string' ? c : c?.name ?? String(c)));
    const rows: any[] = (payload.rows ?? []).map((arr: any[]) => {
      const obj: any = {};
      for (let i = 0; i < cols.length; i++) obj[cols[i]] = unwrap(arr[i]);
      return obj;
    });
    return { rows };
  }
  // v1 error shape
  if (payload && payload.error) {
    throw new Error(typeof payload.error === 'string' ? payload.error : JSON.stringify(payload.error));
  }
  return { rows: [] };
}

type HranaValue = { type: 'null' } | { type: 'text' | 'integer' | 'float' | 'blob'; value: string };

function toHranaArgs(params: any[]): HranaValue[] {
  return params.map((v) => {
    if (v === null || v === undefined) return { type: 'null' } as HranaValue;
    if (typeof v === 'number') {
      if (Number.isInteger(v)) return { type: 'integer', value: String(v) } as HranaValue;
      return { type: 'float', value: String(v) } as HranaValue;
    }
    // default to text
    return { type: 'text', value: String(v) } as HranaValue;
  });
}

export async function exec(sql: string, params: any[] = []): Promise<{ rows: any[] } | ExecResponse> {
  if (!BASE_HOST || !TURSO_TOKEN) {
    throw new Error('Missing EXPO_PUBLIC_TURSO_URL or EXPO_PUBLIC_TURSO_TOKEN');
  }
  const isSelect = /^\s*select/i.test(sql);
  const url2 = endpointV2();
  const body2 = {
    baton: null,
    requests: [
      { execute: { stmt: { sql, args: toHranaArgs(params), want_rows: isSelect } } },
      { close: {} },
    ],
  };
  if (__DEV__) console.log('[turso] POST v2', url2, JSON.stringify(body2).slice(0, 240));
  let res = await fetch(url2, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TURSO_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body2),
  });
  if (!res.ok) {
    // Try alternate v2 shape with `type: 'execute'` key
    const body2b = {
      baton: null,
      requests: [
        { type: 'execute', stmt: { sql, args: toHranaArgs(params), want_rows: isSelect } },
        { type: 'close' },
      ],
    } as any;
    if (__DEV__) console.log('[turso] POST v2 (alt)', url2, JSON.stringify(body2b).slice(0, 240));
    res = await fetch(url2, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TURSO_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body2b),
    });
  }
  if (!res.ok) {
    // Fallback to v1 execute with struct Stmt
    const url1 = BASE_HOST + '/v1/execute';
    const body1 = { stmt: { sql, args: toHranaArgs(params), want_rows: isSelect } };
    if (__DEV__) console.log('[turso] POST v1', url1, JSON.stringify(body1).slice(0, 240));
    res = await fetch(url1, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TURSO_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body1),
    });
    if (!res.ok) throw new Error(`Turso ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  return mapRows(json);
}

export async function migrate() {
  const stmts = [
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
  for (const sql of stmts) {
    await exec(sql);
  }
}
