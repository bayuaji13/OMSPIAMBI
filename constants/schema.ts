export type ID = string;

export type Post = {
  id: ID;
  content: string;
  author?: string;
  createdAt: number; // epoch ms
  updatedAt?: number;
};

export type MarkType = 'shitpost' | 'spark' | 'gonna_implement' | 'ignored';

export type Mark = {
  postId: ID;
  type: MarkType;
  createdAt: number;
};


