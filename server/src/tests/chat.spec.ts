// اختبار end-to-end للشات: سيرفر حقيقي + سوكتين متصلين
import { io as ioc, type Socket } from "socket.io-client";

const B = "http://localhost:4000";

async function post(path: string, body: unknown, token?: string) {
  const res = await fetch(B + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}
async function get(path: string, token: string) {
  const res = await fetch(B + path, { headers: { Authorization: `Bearer ${token}` } });
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
  // 1) نسجل يوزرين
  const r1 = await post("/api/auth/register", { email: "sarah@dc.io", username: "sarah_d", password: "supersecret1", displayName: "Sarah Drasner" });
  const r2 = await post("/api/auth/register", { email: "felix@dc.io", username: "felix_dev", password: "supersecret1", displayName: "Felix" });
  const [t1, t2] = [r1.data.token, r2.data.token];
  console.log("1) register x2 →", r1.status, r2.status);

  // 2) سوكت من غير توكن → يترفض
  try {
    await connect("bad-token");
    console.log("2) bad token → CONNECTED?! (FAIL)");
  } catch { console.log("2) bad token socket → rejected ✓"); }

  // 3) نوصّل الاتنين
  const s1 = await connect(t1);
  const s2 = await connect(t2);
  console.log("3) both sockets connected ✓");

  // 4) sarah تبدأ محادثة مع felix — ومرة تانية لازم يرجع نفس الـ id (find-or-create)
  const c1 = await post("/api/conversations", { username: "felix_dev" }, t1);
  const c2 = await post("/api/conversations", { username: "felix_dev" }, t1);
  console.log("4) start conv →", c1.status, "created:", c1.data.created, "| again → created:", c2.data.created, "| same id:", c1.data.conversationId === c2.data.conversationId);
  const convId = c1.data.conversationId;

  // 5) sarah تبعت رسالة code snippet → felix لازم تجيله real-time
  const incoming = waitFor<any>(s2, "message:new");
  s1.emit("message:send", {
    conversationId: convId,
    body: "Here is the tailwind config",
    codeLanguage: "javascript",
    codeContent: "module.exports = { theme: { extend: {} } }",
  }, (ack: any) => console.log("5a) sender ack →", ack.ok));
  const msg = await incoming;
  console.log("5b) felix received real-time →", msg.body, "| lang:", msg.codeLanguage);

  // 6) typing indicator يوصل للطرف التاني بس
  const typing = waitFor<any>(s2, "typing");
  s1.emit("typing", { conversationId: convId, typing: true });
  const tp = await typing;
  console.log("6) typing indicator →", tp.typing === true ? "received ✓" : "FAIL");

  // 7) مستخدم غريب يحاول يبعت في محادثة مش بتاعته → FORBIDDEN
  const r3 = await post("/api/auth/register", { email: "evil@dc.io", username: "intruder", password: "supersecret1", displayName: "Intruder" });
  const s3 = await connect(r3.data.token);
  const forbidden = await new Promise((r) => s3.emit("message:send", { conversationId: convId, body: "let me in" }, r));
  console.log("7) intruder send →", (forbidden as any).error === "FORBIDDEN" ? "blocked ✓" : "FAIL");
  // وكمان يحاول يقرأ الرسايل بالـ REST → 403
  const read = await get(`/api/conversations/${convId}/messages`, r3.data.token);
  console.log("   intruder read history →", read.status === 403 ? "403 blocked ✓" : "FAIL " + read.status);

  // 8) felix يجيب الـ history والقايمة
  const hist = await get(`/api/conversations/${convId}/messages`, t2);
  const list = await get("/api/conversations", t2);
  console.log("8) history count:", hist.data.messages.length, "| conv list preview:", JSON.stringify(list.data.conversations[0]?.lastMessage?.preview));

  // 9) presence: sarah متصلة؟ وبعد الفصل؟
  const before = await new Promise((r) => s2.emit("presence:query", [msg.senderId], r));
  const presencePromise = waitFor<any>(s2, "presence:update");
  s1.disconnect();
  const update = await presencePromise;
  console.log("9) presence before:", JSON.stringify(before), "→ after disconnect: online =", update.online);

  s2.disconnect(); s3.disconnect();
  process.exit(0);
}
main().catch((e) => { console.error("TEST CRASH:", e); process.exit(1); });
