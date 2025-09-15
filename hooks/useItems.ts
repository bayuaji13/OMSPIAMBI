import { useCallback, useEffect, useMemo, useState } from 'react';
import { Post, ID, Mark, MarkType } from '@/constants/schema';
import { getJSON, setJSON, KEYS } from '@/lib/storage';

type Repo = {
  listPosts: () => Promise<Post[]>;
  getPost: (id: ID) => Promise<Post | undefined>;
  upsertPost: (p: Post) => Promise<void>;
  removePost: (id: ID) => Promise<void>;
  toggleMark: (postId: ID, type: MarkType) => Promise<void>;
  listMarks: () => Promise<Mark[]>;
};

async function loadPosts(): Promise<Post[]> {
  return getJSON<Post[]>(KEYS.items, []);
}

async function savePosts(items: Post[]) {
  await setJSON(KEYS.items, items);
}

async function loadMarks(): Promise<Mark[]> {
  return getJSON<Mark[]>(KEYS.marks, []);
}

async function saveMarks(marks: Mark[]) {
  await setJSON(KEYS.marks, marks);
}

export function useItems() {
  const [items, setItems] = useState<Post[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const [p, m] = await Promise.all([loadPosts(), loadMarks()]);
      setItems(p);
      setMarks(m);
      setReady(true);
    })();
  }, []);

  const repo: Repo = useMemo(
    () => ({
      listPosts: async () => items,
      getPost: async (id) => items.find((x) => x.id === id),
      upsertPost: async (p) => {
        setItems((prev) => {
          const exists = prev.some((x) => x.id === p.id);
          const next = exists ? prev.map((x) => (x.id === p.id ? p : x)) : [p, ...prev];
          savePosts(next);
          return next;
        });
      },
      removePost: async (id) => {
        setItems((prev) => {
          const next = prev.filter((x) => x.id !== id);
          savePosts(next);
          return next;
        });
        setMarks((prev) => {
          const next = prev.filter((m) => m.postId !== id);
          saveMarks(next);
          return next;
        });
      },
      toggleMark: async (postId, type) => {
        setMarks((prev) => {
          const exists = prev.find((m) => m.postId === postId && m.type === type);
          const next = exists
            ? prev.filter((m) => !(m.postId === postId && m.type === type))
            : [{ postId, type, createdAt: Date.now() }, ...prev];
          saveMarks(next);
          return next;
        });
      },
      listMarks: async () => marks,
    }),
    [items, marks]
  );

  const counts = useMemo(() => {
    const c: Record<ID, Record<MarkType, number>> = {} as any;
    for (const m of marks) {
      c[m.postId] ||= { shitpost: 0, spark: 0, gonna_implement: 0 };
      c[m.postId][m.type] += 1;
    }
    return c;
  }, [marks]);

  return { ready, items, marks, counts, repo };
}

