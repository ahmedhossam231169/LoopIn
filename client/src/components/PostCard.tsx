import { useState } from "react";
import { api } from "../lib/api";
import { timeAgo, type Post, type Comment } from "../lib/types";
import { CodeBlock } from "./CodeBlock";

export function PostCard({ post }: { post: Post }) {
  // اللايك optimistic: بنحدث الـ UI فورًا وبنرجّعه لو الطلب فشل
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [commentDraft, setCommentDraft] = useState("");
  const [sending, setSending] = useState(false);

  async function toggleLike() {
    const prev = { liked, likeCount };
    setLiked(!liked);
    setLikeCount((c) => c + (liked ? -1 : 1));
    try {
      const res = await api<{ ok: true; liked: boolean; likeCount: number }>(
        `/api/posts/${post.id}/like`,
        { method: "POST" }
      );
      setLiked(res.liked);
      setLikeCount(res.likeCount); // السيرفر هو مصدر الحقيقة
    } catch {
      setLiked(prev.liked); // rollback
      setLikeCount(prev.likeCount);
    }
  }

  async function openComments() {
    setShowComments((s) => !s);
    if (comments === null) {
      const res = await api<{ ok: true; comments: Comment[] }>(
        `/api/posts/${post.id}/comments`
      ).catch(() => ({ ok: true as const, comments: [] }));
      setComments(res.comments);
    }
  }

  async function sendComment() {
    if (!commentDraft.trim()) return;
    setSending(true);
    try {
      const res = await api<{ ok: true; comment: Comment }>(
        `/api/posts/${post.id}/comments`,
        { method: "POST", body: JSON.stringify({ body: commentDraft }) }
      );
      setComments((c) => [...(c ?? []), res.comment]);
      setCommentCount((n) => n + 1);
      setCommentDraft("");
    } finally {
      setSending(false);
    }
  }

  return (
    <article className="card !p-5">
      {/* Header */}
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-700 font-bold">
          {post.author.profile.displayName[0]?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold">
            {post.author.profile.displayName}{" "}
            <span className="font-normal text-mist-600">@{post.author.username}</span>
          </p>
          <p className="text-xs text-mist-400">{timeAgo(post.createdAt)}</p>
        </div>
        {post.type === "QUESTION" && (
          <span className="ml-auto shrink-0 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-400">
            Help Wanted
          </span>
        )}
      </div>

      {/* Body */}
      {post.title && <h2 className="mb-1 text-lg font-bold">{post.title}</h2>}
      <p className="whitespace-pre-wrap text-mist-100">{post.body}</p>

      {post.type === "SNIPPET" && post.codeContent && post.codeLanguage && (
        <div className="mt-3">
          <CodeBlock code={post.codeContent} language={post.codeLanguage} />
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-5 text-sm text-mist-400">
        <button
          onClick={toggleLike}
          className={"flex items-center gap-1.5 transition-colors hover:text-red-400 " + (liked ? "text-red-400" : "")}
          aria-pressed={liked}
        >
          {liked ? "❤️" : "🤍"} {likeCount}
        </button>
        <button onClick={openComments} className="flex items-center gap-1.5 hover:text-mist-100">
          💬 {commentCount}
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="mt-4 space-y-3 border-t border-ink-700 pt-4">
          {comments === null && <p className="text-sm text-mist-400">Loading comments...</p>}
          {comments?.length === 0 && (
            <p className="text-sm text-mist-400">No comments yet. Start the thread.</p>
          )}
          {comments?.map((c) => (
            <div key={c.id} className="rounded-lg bg-ink-900 px-3 py-2">
              <p className="text-sm">
                <span className="font-semibold">{c.author.profile.displayName}</span>{" "}
                <span className="text-xs text-mist-600">· {timeAgo(c.createdAt)}</span>
              </p>
              <p className="mt-0.5 text-sm text-mist-100">{c.body}</p>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              className="input-field !py-2 text-sm"
              placeholder="Write a comment..."
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendComment()}
            />
            <button
              onClick={sendComment}
              disabled={sending || !commentDraft.trim()}
              className="btn-primary !py-2 text-sm disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
