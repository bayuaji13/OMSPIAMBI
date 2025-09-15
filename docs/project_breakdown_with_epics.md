# 🌀 One Man’s Shitpost → Another Man’s Breakthrough
Project Breakdown & Design Guide (All data in TursoDB)

---

## 🎯 Target Platforms
- **Mobile**: iOS & Android (Expo React Native, Managed workflow)  
- **Web**: React Native Web (single codebase, responsive)  

---

## 📐 Core Product Rules
- **Single source of truth**: Everything is stored and read from **TursoDB**.  
- **Crowd markings, not tasks**: Users mark each post as `shitpost`, `spark`, or `gonna_implement`. Marks are per-user and additive (counters are visible to everyone).  
- **Users can submit shitposts**: Any logged-in user can post a new idea (default category = `shitpost`).  
- **Personal category cards**: Every user has two quick-access cards:  
  - **My Sparks** → posts the user marked as `spark`  
  - **My Gonna Implement** → posts the user marked as `gonna_implement`  

---

## 🗄️ TursoDB Schema (authoritative)

```sql
-- Users & sessions
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,           -- ulid()
  username      TEXT UNIQUE NOT NULL,
  password_algo TEXT NOT NULL DEFAULT 'scrypt',
  password_salt BLOB NOT NULL,
  password_hash BLOB NOT NULL,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token        TEXT PRIMARY KEY,            -- random base64url
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TEXT NOT NULL,
  expires_at   TEXT NOT NULL,
  device_label TEXT
);

-- Ideas (shitposts)
CREATE TABLE IF NOT EXISTS posts (
  id          TEXT PRIMARY KEY,             -- ulid()
  author_id   TEXT NOT NULL REFERENCES users(id),
  content     TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

-- Per-user crowd markings (reactions)
CREATE TABLE IF NOT EXISTS post_marks (
  post_id     TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mark_type   TEXT NOT NULL CHECK (mark_type IN ('shitpost','spark','gonna_implement')),
  created_at  TEXT NOT NULL,
  PRIMARY KEY (post_id, user_id, mark_type)
);

-- Optional: showcases (proofs/demos). Not required to view category cards.
CREATE TABLE IF NOT EXISTS showcases (
  id           TEXT PRIMARY KEY,            -- ulid()
  post_id      TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note         TEXT,
  media_urls   TEXT,                         -- JSON array string
  submitted_at TEXT NOT NULL
);
```

---

## 🔐 Auth (Turso-only)
- **Register**: client hashes password with **scrypt** + random salt → store `salt`, `hash`, `algo`.  
- **Login**: recompute scrypt and compare; on success create a **session** row and store `token` locally (SecureStore on mobile, localStorage on web).  
- **Guard writes**: each mutation includes the session token; SQL checks `sessions` where `expires_at > now()`.  

---

## 📊 Essential Queries (UI-driven)

### Create / Fetch

```sql
-- Create shitpost
INSERT INTO posts (id, author_id, content, created_at)
VALUES (?, ?, ?, datetime('now'));

-- Mark / unmark
INSERT INTO post_marks (post_id, user_id, mark_type, created_at)
VALUES (?, ?, ?, datetime('now'))
ON CONFLICT(post_id, user_id, mark_type) DO UPDATE SET created_at = datetime('now');

DELETE FROM post_marks WHERE post_id = ? AND user_id = ? AND mark_type = ?;
```

### Feed with crowd counts (global view)

```sql
SELECT
  p.id, p.content, p.created_at, u.username AS author,
  SUM(CASE WHEN m.mark_type='shitpost' THEN 1 ELSE 0 END) AS shitpost_count,
  SUM(CASE WHEN m.mark_type='spark' THEN 1 ELSE 0 END) AS spark_count,
  SUM(CASE WHEN m.mark_type='gonna_implement' THEN 1 ELSE 0 END) AS gonna_implement_count
FROM posts p
JOIN users u ON u.id = p.author_id
LEFT JOIN post_marks m ON m.post_id = p.id
GROUP BY p.id
ORDER BY p.created_at DESC
LIMIT 50 OFFSET ?;
```

### Current user’s mark per post (to highlight UI state)

```sql
SELECT post_id, mark_type
FROM post_marks
WHERE user_id = ?;
```

### Personal Category Cards

```sql
-- My Sparks card
SELECT p.id, p.content, p.created_at, u.username AS author
FROM post_marks pm
JOIN posts p ON p.id = pm.post_id
JOIN users u ON u.id = p.author_id
WHERE pm.user_id = ? AND pm.mark_type = 'spark'
ORDER BY pm.created_at DESC
LIMIT 50 OFFSET ?;

-- My Gonna Implement card
SELECT p.id, p.content, p.created_at, u.username AS author
FROM post_marks pm
JOIN posts p ON p.id = pm.post_id
JOIN users u ON u.id = p.author_id
WHERE pm.user_id = ? AND pm.mark_type = 'gonna_implement'
ORDER BY pm.created_at DESC
LIMIT 50 OFFSET ?;
```

### Top posts by mark type (boards/lists)

```sql
-- Top Sparks (last 7 days)
SELECT p.id, p.content,
       COUNT(*) AS cnt
FROM post_marks pm
JOIN posts p ON p.id = pm.post_id
WHERE pm.mark_type='spark'
  AND pm.created_at >= datetime('now','-7 days')
GROUP BY p.id
ORDER BY cnt DESC, p.created_at DESC
LIMIT 20;
```

---

## 🧭 App IA & Screens

1. **Auth**
   - Register / Login (username + password)  
   - Session persistence  

2. **Home**
   - **Global Feed** (card list)  
   - Each card shows content + counters:  
     - `🔥 Spark (xN)` · `🛠️ Gonna Implement (xM)` · `💬 Shitpost (xK)`  
   - Tap reaction chips to add/remove your mark; counts update instantly.  
   - **➕ Submit Shitpost button** → opens create-post screen.  

3. **Create Post**
   - Textarea input (short idea, max ~280 chars).  
   - Submit → inserts into `posts` with state = shitpost.  

4. **My Cards**
   - **My Sparks** → posts the current user marked as `spark`  
   - **My Gonna Implement** → posts the current user marked as `gonna_implement`  

5. **Post Detail**
   - Content, author  
   - Counters + your mark state  
   - (Optional) Showcases gallery  

6. **Search / Filter (optional)**
   - Filter by keyword  
   - Sort by most sparks / most gonna_implement / newest  

---

## 🧱 Tech Stack

- **App**: Expo React Native (Managed) + React Native Web  
- **DB**: Turso (HTTP API from the app)  
- **Storage**: SecureStore (mobile) / localStorage (web) for session token only  
- **Crypto**: `scrypt-js` for password hashing  
- **IDs**: `ulidx` (ULID)  
- **Styling**: NativeWind (Tailwind for RN) or Tamagui  
- **Icons**: Lucide/Feather  

> Note: Embedding an RW Turso token in the client is acceptable for prototypes/trusted users. For public distribution, harden later with a tiny edge proxy.  

---

## 🎨 Design Guidance (derived from your reference)

### Aesthetic
- **Playful minimalism** with generous white space  
- **High contrast**: white surfaces, deep black blocks, warm peach accents  
- **Soft geometry**: rounded cards, pill chips, circular avatars, blobby/wavy headers  

### Color
- **Peach (Accent)**: `#F8BFA0`  
- **Black (Contrast)**: `#1C1C1C`  
- **White (Base)**: `#FFFFFF`  
- **Greys**: `#7A7A7A` (secondary text), `#E5E5E5` (dividers)  

Usage: ~70% white, 20% black, 10% peach.  

### Type
- **Headings**: Poppins/Nunito/SF Pro Rounded  
- **Body**: Inter/Roboto  
- **Scale**: H1 28–32 / H2 20–24 / Body 14–16 / Caption 12  
- Strong contrast; invert to white when placed on black blocks  

### Components
- **Reaction chips** (primary pattern): peach pills with icon + count; filled when user marked  
- **Cards**: rounded, subtle shadow, big content focus  
- **Tabs/Filters**: pill chips, horizontally scrollable  
- **Calendar/Stats** (optional): peach highlights on neutral background  
- **My Cards**: two prominent cards leading to the user’s marked lists  
- **Create Post Form**: textarea + peach CTA button (“Post Shitpost 🚀”)  

### Motion
- **Onboarding**: blob morph + illustration fade  
- **Interactions**: chip press bounce; counters animate (+1/-1)  
- **Scroll**: blobby header slight parallax/shrink  

---

## 📦 Phase Plan & EPICs

### Phase 1 — Foundation
**EPIC 1: Auth & Identity**
- Turso schema + migrations  
- Register/Login + sessions  

**EPIC 2: Shitpost Creation**
- Submit new shitpost (create posts)  

**EPIC 3: Feed & Reactions**
- Global Feed with counters  
- Reaction chips (mark/unmark) wired to DB  

---

### Phase 2 — Personal Views
**EPIC 4: My Categories**
- My Sparks list  
- My Gonna Implement list  

**EPIC 5: Post Details**
- Post Detail view (counters, author, your mark)  

**EPIC 6: Search & Filter**
- Basic search/sort features  

---

### Phase 3 — Polishing
**EPIC 7: UX & UI Polish**
- Onboarding flow with blobby visuals  
- Dark/Light themes  
- Empty states & micro-animations  

---

### Phase 4 — Optional Extras
**EPIC 8: Showcases**
- Showcase gallery for results/demos  

**EPIC 9: Insights**
- Top charts (weekly sparks / gonna_implement)  

**EPIC 10: Advanced Sharing**
- QR export/import (if you later add offline rooms)  

---

## 🧪 Minimal API Wrapper (client → Turso)

```ts
// POST /v1/execute with SQL+params
async function exec(sql: string, params: any[] = []) {
  const res = await fetch(`${TURSO_URL}/v1/execute`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TURSO_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql, params })
  });
  if (!res.ok) throw new Error(`Turso ${res.status}`);
  return res.json();
}
```

---

## 🔎 Example UI Queries Wiring

- **Home feed**: run “Feed with crowd counts” + “Current user’s mark per post”; merge by `post_id` to highlight user’s selection.  
- **My Sparks / My Gonna Implement**: run respective card query with current `user_id`.  
- **Chip tap (toggle)**:  
  - If user has not marked → `INSERT ... ON CONFLICT DO UPDATE`  
  - If tapping again to remove → `DELETE` for that `mark_type`  
- **New shitpost submission**: call `INSERT INTO posts (...)` with author_id and content.  

