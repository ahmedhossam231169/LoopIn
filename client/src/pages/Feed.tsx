import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Post } from "../lib/types";
import { Navbar } from "../components/Navbar";
import { Composer } from "../components/Composer";
import { PostCard } from "../components/PostCard";

type Sort = "latest" | "top";

export default function Feed() {
  const [sort, setSort] = useState<Sort>("latest");
  const [posts, setPosts] = useState<Post[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (s: Sort) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ ok: true; posts: Post[]; nextCursor: string | null }>(
        `/api/posts?sort=${s}&take=10`
      );
      setPosts(res.posts);
      setNextCursor(res.nextCursor);
    } catch {
      setError("Couldn't load the feed. Is the server running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(sort);
  }, [sort, load]);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await api<{ ok: true; posts: Post[]; nextCursor: string | null }>(
        `/api/posts?sort=${sort}&take=10&cursor=${nextCursor}`
      );
      setPosts((p) => [...p, ...res.posts]);
      setNextCursor(res.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  const tab = (s: Sort, label: string) => (
    <button
      onClick={() => setSort(s)}
      className={
        "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors " +
        (sort === s ? "bg-brand-500 text-white" : "text-mist-400 hover:text-mist-100")
      }
    >
      {label}
    </button>
  );

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        <Composer onCreated={(post) => setPosts((p) => [post, ...p])} />

        <div className="flex gap-1">
          {tab("latest", "Latest")}
          {tab("top", "Top")}
        </div>

        {loading && <p className="py-8 text-center text-sm text-mist-400">Loading feed...</p>}

        {error && (
          <div className="card !p-4 text-center">
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={() => load(sort)} className="btn-ghost mt-3 !py-2 text-sm">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="card !p-8 text-center">
            <p className="font-semibold">The feed is empty</p>
            <p className="mt-1 text-sm text-mist-400">Be the first — share what you're building.</p>
          </div>
        )}

        {posts.map((p) => (
          <PostCard key={p.id} post={p} onDeleted={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))} />
        ))}

        {nextCursor && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="btn-ghost w-full justify-center text-sm disabled:opacity-50"
          >
            {loadingMore ? "Loading..." : "Load more"}
          </button>
        )}
      </main>
    </>
  );
}
