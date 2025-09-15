import { useEffect, useMemo, useState } from 'react';
import { Post, ID, Mark, MarkType } from '@/constants/schema';
import { exec } from '@/lib/turso';
import { getCurrentUserId } from '@/lib/auth';
import { ulid } from 'ulidx';

type Repo = {
  listPosts: () => Promise<Post[]>;
  getPost: (id: ID) => Promise<Post | undefined>;
  upsertPost: (content: string) => Promise<void>;
  removePost: (id: ID) => Promise<void>;
  toggleMark: (postId: ID, type: MarkType) => Promise<void>;
  listMarks: () => Promise<Mark[]>;
};

export function useItems() {
  const [items, setItems] = useState<Post[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [counts, setCounts] = useState<Record<ID, Record<MarkType, number>>>({} as any);
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadAll() {
    setLoading(true);
    const uid = await getCurrentUserId();
    setUserId(uid);
    // Feed with counts
    const feed: any = await exec(
      `SELECT p.id, p.content, p.created_at, p.author_id, u.username,
              COALESCE(SUM(CASE WHEN m.mark_type='shitpost' THEN 1 ELSE 0 END), 0) AS shitpost_count,
              COALESCE(SUM(CASE WHEN m.mark_type='spark' THEN 1 ELSE 0 END), 0) AS spark_count,
              COALESCE(SUM(CASE WHEN m.mark_type='gonna_implement' THEN 1 ELSE 0 END), 0) AS gonna_implement_count
       FROM posts p
       JOIN users u ON u.id = p.author_id
       LEFT JOIN post_marks m ON m.post_id = p.id
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT 100;`,
      []
    );
    const itemsOut: Post[] = (feed?.rows ?? []).map((r: any) => ({
      id: r.id,
      content: r.content,
      createdAt: Date.parse(r.created_at || '') || Date.now(),
      author: r.username,
    }));
    if (__DEV__) console.log('[repo] feed rows', feed?.rows?.length ?? 0);
    setItems(itemsOut);
    const cMap: Record<ID, Record<MarkType, number>> = {} as any;
    for (const r of feed?.rows ?? []) {
      cMap[r.id] = {
        shitpost: Number(r.shitpost_count ?? 0),
        spark: Number(r.spark_count ?? 0),
        gonna_implement: Number(r.gonna_implement_count ?? 0),
      };
    }
    setCounts(cMap);
    // Marks of current user
    if (uid) {
      const mres: any = await exec(`SELECT post_id, mark_type, created_at FROM post_marks WHERE user_id = ?;`, [uid]);
      const marksOut: Mark[] = (mres?.rows ?? []).map((r: any) => ({
        postId: r.post_id,
        type: r.mark_type,
        createdAt: Date.parse(r.created_at || '') || Date.now(),
      }));
      setMarks(marksOut);
    } else {
      setMarks([]);
    }
    setReady(true);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const repo: Repo = useMemo(
    () => ({
      listPosts: async () => items,
      getPost: async (id) => items.find((x) => x.id === id),
      upsertPost: async (content: string) => {
        if (__DEV__) console.log('[repo] upsertPost begin');
        const uid = await getCurrentUserId();
        if (!uid) throw new Error('Not authenticated');
        const id = ulid();
        const now = new Date().toISOString();
        if (__DEV__) console.log('[repo] inserting post', id);
        await exec(
          `INSERT INTO posts (id, author_id, content, created_at) VALUES (?, ?, ?, ?);`,
          [id, uid, content, now]
        );
        // Verify write
        const verify: any = await exec(`SELECT id FROM posts WHERE id = ?;`, [id]);
        if (!verify?.rows?.length) {
          throw new Error('Write verification failed: post not found after insert');
        }
        if (__DEV__) console.log('[repo] insert verified, reloading feed');
        await loadAll();
        if (__DEV__) console.log('[repo] upsertPost done');
      },
      removePost: async (id) => {
        const uid = await getCurrentUserId();
        if (!uid) throw new Error('Not authenticated');
        await exec(`DELETE FROM posts WHERE id = ? AND author_id = ?;`, [id, uid]);
        await loadAll();
      },
      toggleMark: async (postId, type) => {
        const uid = await getCurrentUserId();
        if (!uid) throw new Error('Not authenticated');
        const exists: any = await exec(
          `SELECT 1 as x FROM post_marks WHERE post_id = ? AND user_id = ? AND mark_type = ?;`,
          [postId, uid, type]
        );
        if (exists?.rows?.length) {
          await exec(`DELETE FROM post_marks WHERE post_id = ? AND user_id = ? AND mark_type = ?;`, [postId, uid, type]);
        } else {
          await exec(`INSERT INTO post_marks (post_id, user_id, mark_type, created_at) VALUES (?, ?, ?, ?);`, [postId, uid, type, new Date().toISOString()]);
        }
        await loadAll();
      },
      listMarks: async () => marks,
    }),
    [items, marks]
  );

  const reload = async () => {
    await loadAll();
  };

  return { ready, loading, items, marks, counts, repo, reload };
}
