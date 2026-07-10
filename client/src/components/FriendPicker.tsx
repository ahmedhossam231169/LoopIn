import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import type { UserCard } from "../lib/types";

// ---------------------------------------------------------------
// اختيار صاحب وإرسال رسالة جاهزة له في الشات
// بيتستخدم في: مشاركة بوست، دعوة لكوميونتي، دعوة لمتابعة صفحة
// ---------------------------------------------------------------
export function FriendPicker({
  message,
  title = "Send to a friend",
  onClose,
}: {
  message: string; // نص الرسالة اللي هتتبعت في الشات
  title?: string;
  onClose: () => void;
}) {
  const [friends, setFriends] = useState<UserCard[] | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    api<{ ok: true; friends: UserCard[] }>("/api/friends")
      .then((res) => setFriends(res.friends))
      .catch(() => setFriends([]));
  }, []);

  async function sendToFriend(username: string) {
    setSentTo(username);
    try {
      // find-or-create المحادثة، وبعدين نبعت الرسالة على نفس قناة الشات
      const conv = await api<{ ok: true; conversationId: string }>("/api/conversations", {
        method: "POST",
        body: JSON.stringify({ username }),
      });
      getSocket().emit("message:send", { conversationId: conv.conversationId, body: message });
      setTimeout(() => {
        onClose();
        setSentTo(null);
      }, 1200);
    } catch {
      setSentTo(null);
    }
  }

  return (
    <div className="mt-2 rounded-lg border border-ink-700 bg-ink-900 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-mist-400">{title}</p>
        <button onClick={onClose} className="text-xs text-mist-600 hover:text-mist-100">✕</button>
      </div>
      {friends === null ? (
        <p className="text-xs text-mist-400">Loading friends...</p>
      ) : friends.length === 0 ? (
        <p className="text-xs text-mist-400">You have no friends yet — add some first.</p>
      ) : (
        <div className="max-h-48 space-y-1.5 overflow-y-auto">
          {friends.map((f) => (
            <button
              key={f.username}
              onClick={() => sendToFriend(f.username)}
              disabled={sentTo !== null}
              className="flex w-full items-center gap-2.5 rounded px-1 py-1 text-left hover:bg-ink-800 disabled:opacity-60"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink-700 text-xs font-bold">
                {f.profile.avatarUrl ? (
                  <img src={f.profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  f.profile.displayName[0]?.toUpperCase()
                )}
              </div>
              <span className="text-sm">{f.profile.displayName}</span>
              {sentTo === f.username && <span className="ml-auto text-xs text-emerald-400">Sent ✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
