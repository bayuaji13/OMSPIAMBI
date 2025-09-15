import { exec } from '@/lib/turso';
import { scrypt } from 'scrypt-js';
import { getRandomBytesAsync } from 'expo-crypto';
import bcrypt from 'bcryptjs';
import { ulid } from 'ulidx';
import { getJSON, setJSON, KEYS, remove } from '@/lib/storage';

const N = 16384, r = 8, p = 1, dkLen = 32;

function toHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
function fromHex(hex: string) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.substr(i * 2, 2), 16);
  return arr;
}

async function hashPasswordScrypt(password: string, saltHex?: string) {
  const enc = new TextEncoder();
  const salt = saltHex ? fromHex(saltHex) : new Uint8Array(await getRandomBytesAsync(16));
  const pwd = enc.encode(password);
  const out = await scrypt(pwd, salt, N, r, p, dkLen);
  const hash = toHex(new Uint8Array(out));
  const saltOut = saltHex || toHex(salt);
  return { algo: 'scrypt', hash, salt: saltOut } as const;
}

async function hashPasswordBcrypt(password: string) {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  return { algo: 'bcrypt', hash, salt } as const;
}

export type Session = { token: string; userId: string; username: string };

let memorySession: Session | null = null;

export async function register(username: string, password: string): Promise<void> {
  username = username.trim().toLowerCase();
  if (!username || !password) throw new Error('Missing username/password');
  const id = ulid();
  const { algo, hash, salt } = await hashPasswordBcrypt(password);
  const now = new Date().toISOString();
  // Upsert using SELECT+INSERT/UPDATE for maximum compatibility
  const existing: any = await exec(`SELECT id FROM users WHERE username = ?;`, [username]);
  if (existing?.rows?.length) {
    await exec(
      `UPDATE users SET password_algo=?, password_salt=?, password_hash=?, updated_at=? WHERE username = ?;`,
      [algo, salt, hash, now, username]
    );
  } else {
    await exec(
      `INSERT INTO users (id, username, password_algo, password_salt, password_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [id, username, algo, salt, hash, now, now]
    );
  }
  // Verify write
  if (__DEV__) {
    const check: any = await exec(`SELECT password_salt, password_hash FROM users WHERE username = ?;`, [username]);
    const row = check?.rows?.[0];
    if (!row || !row.password_salt || !row.password_hash) {
      console.log('[auth] register write anomaly', row);
      throw new Error('Registration write failed: empty credentials stored');
    }
  }
}

export async function login(username: string, password: string, remember = true): Promise<Session> {
  username = username.trim().toLowerCase();
  const res: any = await exec(`SELECT id, username, password_algo, password_salt, password_hash FROM users WHERE username = ?;`, [username]);
  const row = res?.rows?.[0];
  if (!row) throw new Error('User not found');
  const { id } = row;
  const algo = String(row.password_algo || '').toLowerCase();
  const salt = String(row.password_salt || '').trim();
  const storedHash = String(row.password_hash || '').trim();
  let ok = false;
  if (algo === 'bcrypt') {
    ok = await bcrypt.compare(password, storedHash);
  } else if (algo === 'scrypt') {
    const { hash } = await hashPasswordScrypt(password, salt);
    ok = hash.toLowerCase() === storedHash.toLowerCase();
  }
  if (!ok) {
    if (__DEV__) {
      console.log('[auth] hash mismatch', {
        user: username,
        algo,
        saltLen: salt.length,
        hashLen: storedHash.length,
        storedSample: storedHash.slice(0, 8),
      });
    }
    throw new Error('Invalid credentials');
  }
  const token = ulid();
  const now = new Date();
  const expires = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 14); // 14 days
  await exec(
    `INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?);`,
    [token, id, now.toISOString(), expires.toISOString()]
  );
  const session: Session = { token, userId: id, username };
  memorySession = session;
  if (remember) {
    await setJSON(KEYS.sessionToken, token);
    await setJSON(KEYS.sessionUser, { id, username });
  }
  return session;
}

export async function logout(): Promise<void> {
  const token = await getJSON<string | null>(KEYS.sessionToken, null);
  if (token) await exec(`DELETE FROM sessions WHERE token = ?;`, [token]);
  await remove(KEYS.sessionToken);
  await remove(KEYS.sessionUser);
  memorySession = null;
}

export async function currentSession(): Promise<Session | null> {
  if (memorySession) return memorySession;
  const token = await getJSON<string | null>(KEYS.sessionToken, null);
  const user = await getJSON<{ id: string; username: string } | null>(KEYS.sessionUser, null);
  if (!token || !user) return null;
  const res: any = await exec(`SELECT token FROM sessions WHERE token = ? AND expires_at > datetime('now');`, [token]);
  const row = res?.rows?.[0];
  if (!row) return null;
  const session: Session = { token, userId: user.id, username: user.username };
  memorySession = session;
  return session;
}
