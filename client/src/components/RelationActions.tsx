import { useEffect, useState } from "react";
import { UserPlus, UserCheck, Clock, MoreHorizontal, Flag, Ban, CheckCircle2 } from "lucide-react";
import { api } from "../lib/api";
import type { FriendState, RelationStatus } from "../lib/types";

export function RelationActions({ username }: { username: string }) {
  const [state, setState] = useState<FriendState>("none");
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    api<{ ok: true } & RelationStatus>(`/api/friends/status/${username}`)
      .then((r) => {
        setState(r.friendState);
        setFollowing(r.following);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [username]);

  async function friendAction() {
    setBusy(true);
    try {
      if (state === "none") {
        await api("/api/friends/request", { method: "POST", body: JSON.stringify({ username }) });
        setState("request_sent");
      } else if (state === "request_sent" || state === "friends") {
        await api(`/api/friends/${username}`, { method: "DELETE" });
        setState("none");
      } else if (state === "request_received") {
        await api("/api/friends/respond", { method: "POST", body: JSON.stringify({ username, accept: true }) });
        setState("friends");
      }
    } finally {
      setBusy(false);
    }
  }

  async function declineRequest() {
    setBusy(true);
    try {
      await api("/api/friends/respond", { method: "POST", body: JSON.stringify({ username, accept: false }) });
      setState("none");
    } finally {
      setBusy(false);
    }
  }

  async function toggleFollow() {
    setBusy(true);
    try {
      const r = await api<{ ok: true; following: boolean }>(`/api/friends/follow/${username}`, { method: "POST" });
      setFollowing(r.following);
    } finally {
      setBusy(false);
    }
  }

  async function blockUser() {
    setBlocking(true);
    try {
      await api(`/api/moderation/block/${username}`, { method: "POST" });
      setState("none");
      setFollowing(false);
      setBlocked(true);
      setTimeout(() => {
        setBlockConfirmOpen(false);
        setBlocked(false);
      }, 1500);
    } finally {
      setBlocking(false);
    }
  }

  async function submitReport() {
    const reason = reportReason.trim();
    if (!reason) return; // الكومنت إلزامي
    setReporting(true);
    try {
      await api("/api/moderation/report", { method: "POST", body: JSON.stringify({ username, reason }) });
      setReportSubmitted(true);
      setTimeout(() => {
        setReportOpen(false);
        setReportSubmitted(false);
        setReportReason("");
      }, 1800);
    } finally {
      setReporting(false);
    }
  }

  if (loading) return null;

  const friendIcon =
    state === "friends" ? <UserCheck size={15} />
    : state === "request_sent" ? <Clock size={15} />
    : state === "request_received" ? <UserCheck size={15} />
    : <UserPlus size={15} />;

  const friendLabel =
    state === "friends" ? "Friends"
    : state === "request_sent" ? "Requested"
    : state === "request_received" ? "Accept"
    : "Add friend";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={friendAction}
        disabled={busy}
        className={
          "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50 " +
          (state === "friends" || state === "request_sent"
            ? "border border-ink-700 text-mist-100 hover:bg-ink-900"
            : "bg-brand-500 text-white hover:bg-brand-600")
        }
      >
        {friendIcon} {friendLabel}
      </button>

      {/* لو في طلب وارد، نضيف زرار رفض */}
      {state === "request_received" && (
        <button onClick={declineRequest} disabled={busy} className="btn-ghost !py-2 text-sm">
          Decline
        </button>
      )}

      <button
        onClick={toggleFollow}
        disabled={busy}
        className={
          "rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50 " +
          (following ? "border border-brand-500/40 bg-brand-500/10 text-brand-400" : "border border-ink-700 text-mist-100 hover:bg-ink-900")
        }
      >
        {following ? "Following" : "Follow"}
      </button>

      {/* قائمة الإشراف */}
      <div className="relative">
        <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center justify-center rounded-lg border border-ink-700 px-2 py-2 text-mist-400 hover:bg-ink-900" aria-label="More options">
          <MoreHorizontal size={18} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 z-10 mt-1 w-36 rounded-lg border border-ink-700 bg-ink-800 py-1 text-sm shadow-xl">
            <button onClick={() => { setMenuOpen(false); setReportOpen(true); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-ink-900">
              <Flag size={14} /> Report
            </button>
            <button onClick={() => { setMenuOpen(false); setBlockConfirmOpen(true); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-red-400 hover:bg-ink-900">
              <Ban size={14} /> Block
            </button>
          </div>
        )}
      </div>

      {/* مودال الريبورت — الكومنت إلزامي عشان الإدارة تعرف تراجع الحساب صح */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setReportOpen(false)}>
          <div className="card w-full max-w-sm !p-5" onClick={(e) => e.stopPropagation()}>
            {reportSubmitted ? (
              <div className="flex flex-col items-center py-4 text-center">
                <CheckCircle2 size={36} className="mb-2 text-emerald-400" />
                <p className="font-semibold">Report submitted</p>
                <p className="mt-1 text-sm text-mist-400">Our team will review it shortly.</p>
              </div>
            ) : (
              <>
                <h3 className="mb-1 text-base font-bold">Report @{username}</h3>
                <p className="mb-3 text-sm text-mist-400">Tell us what's wrong. This field is required.</p>
                <textarea
                  className="input-field min-h-24 resize-y text-sm"
                  placeholder="Describe the issue..."
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  autoFocus
                />
                <div className="mt-3 flex justify-end gap-2">
                  <button onClick={() => setReportOpen(false)} className="btn-ghost !py-1.5 text-sm">Cancel</button>
                  <button
                    onClick={submitReport}
                    disabled={reporting || !reportReason.trim()}
                    className="btn-primary !py-1.5 text-sm disabled:opacity-50"
                  >
                    {reporting ? "Submitting..." : "Submit report"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* مودال الحظر — نفس ديزاين مودال الريبورت */}
      {blockConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !blocking && setBlockConfirmOpen(false)}>
          <div className="card w-full max-w-sm !p-5" onClick={(e) => e.stopPropagation()}>
            {blocked ? (
              <div className="flex flex-col items-center py-4 text-center">
                <CheckCircle2 size={36} className="mb-2 text-emerald-400" />
                <p className="font-semibold">@{username} has been blocked</p>
              </div>
            ) : (
              <>
                <h3 className="mb-1 text-base font-bold">Block @{username}?</h3>
                <p className="mb-3 text-sm text-mist-400">
                  This removes any friendship and follow between you.
                </p>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setBlockConfirmOpen(false)} disabled={blocking} className="btn-ghost !py-1.5 text-sm disabled:opacity-50">
                    Cancel
                  </button>
                  <button
                    onClick={blockUser}
                    disabled={blocking}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                  >
                    {blocking ? "Blocking..." : "Block"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
