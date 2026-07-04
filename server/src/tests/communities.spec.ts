import { io as ioc, type Socket } from "socket.io-client";

const B = "http://localhost:4000";

async function req(method: string, path: string, token?: string, body?: unknown) {
  const res = await fetch(B + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json() };
}
function connect(token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const s = ioc(B, { auth: { token }, transports: ["websocket"] });
    s.on("connect", () => resolve(s));
    s.on("connect_error", reject);
  });
}
const waitFor = <T,>(s: Socket, ev: string) => new Promise<T>((r) => s.once(ev, r));

async function main() {
  // 1) نسجل مالك المجتمع وعضو جديد
  const owner = await req("POST", "/api/auth/register", undefined, {
    email: "owner@dc.io", username: "react_owner", password: "supersecret1", displayName: "React Owner",
  });
  const joiner = await req("POST", "/api/auth/register", undefined, {
    email: "joiner@dc.io", username: "new_joiner", password: "supersecret1", displayName: "New Joiner",
  });
  const [tOwner, tJoiner] = [owner.data.token, joiner.data.token];
  console.log("1) register owner + joiner →", owner.status, joiner.status);

  // 2) الاتنين يوصّلوا سوكت عشان نستقبل إشعارات real-time
  const sOwner = await connect(tOwner);
  const sJoiner = await connect(tJoiner);

  // 3) owner ينشئ مجتمع "React Masters"
  const create = await req("POST", "/api/communities", tOwner, {
    name: "React Masters", description: "Advanced React patterns", category: "Frontend",
  });
  console.log("3) create community →", create.status, "| slug:", create.data.community.slug);
  const slug = create.data.community.slug;

  // 4) قايمة المجتمعات فيها joinedByMe=true للـ owner، false للـ joiner
  const listOwner = await req("GET", "/api/communities", tOwner);
  const listJoiner = await req("GET", "/api/communities", tJoiner);
  const ownerView = listOwner.data.communities.find((c: any) => c.slug === slug);
  const joinerView = listJoiner.data.communities.find((c: any) => c.slug === slug);
  console.log("4) joinedByMe → owner:", ownerView.joinedByMe, "| joiner:", joinerView.joinedByMe, "| memberCount:", ownerView.memberCount);

  // 5) joiner ينضم → owner المفروض ياخد إشعار real-time فورًا
  const notifPromise = waitFor<any>(sOwner, "notification:new");
  const join = await req("POST", `/api/communities/${slug}/join`, tJoiner);
  const notif = await notifPromise;
  console.log("5) join →", join.status, join.data.joined, "| memberCount now:", join.data.memberCount);
  console.log("   owner received real-time notification:", notif.message);

  // 6) owner يجيب قايمة إشعاراته بالـ REST — لازم يلاقيها فيها ومش مقروءة
  const notifList = await req("GET", "/api/notifications", tOwner);
  console.log("6) owner notifications → count:", notifList.data.notifications.length, "| unreadCount:", notifList.data.unreadCount);

  // 7) نعلّم كل الإشعارات مقروءة
  await req("POST", "/api/notifications/read-all", tOwner);
  const afterRead = await req("GET", "/api/notifications", tOwner);
  console.log("7) after read-all → unreadCount:", afterRead.data.unreadCount);

  // 8) تفاصيل المجتمع بعد الانضمام
  const detail = await req("GET", `/api/communities/${slug}`, tJoiner);
  console.log("8) community detail → memberCount:", detail.data.community.memberCount, "| preview:", detail.data.community.memberPreview.map((m: any) => m.username));

  // 9) joiner يعمل لايك على بوست owner → owner ياخد إشعار POST_LIKE
  const post = await req("POST", "/api/posts", tOwner, { type: "TEXT", body: "Hello React community!" });
  const likeNotifPromise = waitFor<any>(sOwner, "notification:new");
  await req("POST", `/api/posts/${post.data.post.id}/like`, tJoiner);
  const likeNotif = await likeNotifPromise;
  console.log("9) like notification →", likeNotif.type, "|", likeNotif.message);

  // 10) joiner يحاول يسيب المجتمع وهو العضو الوحيد الغير-admin → لازم ينجح عادي (مش admin)
  const leave = await req("POST", `/api/communities/${slug}/join`, tJoiner);
  console.log("10) joiner leaves → joined:", leave.data.joined, "| memberCount:", leave.data.memberCount);

  // 11) owner (admin وحيد) يحاول يسيب → لازم يترفض
  const ownerLeave = await req("POST", `/api/communities/${slug}/join`, tOwner);
  console.log("11) sole admin tries to leave →", ownerLeave.status, ownerLeave.data.error?.message);

  sOwner.disconnect(); sJoiner.disconnect();
  process.exit(0);
}

main().catch((e) => { console.error("TEST CRASH:", e); process.exit(1); });
