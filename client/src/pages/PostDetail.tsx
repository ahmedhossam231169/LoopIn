import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import type { Post } from "../lib/types";
import { Navbar } from "../components/Navbar";
import { PostCard } from "../components/PostCard";

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    api<{ ok: true; post: Post }>(`/api/posts/${id}`)
      .then((res) => setPost(res.post))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Couldn't load this post"))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        {loading && <p className="py-8 text-center text-sm text-mist-400">Loading post...</p>}

        {error && (
          <div className="card !p-4 text-center">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {post && <PostCard post={post} />}
      </main>
    </>
  );
}
