// اختبار الإغلاق الآمن — بيشغّل السيرفر جوه نفس العملية وبيطلق SIGTERM.
//
// ⚠️ ليه بنطلق الحدث بدل ما نبعت إشارة حقيقية:
// ويندوز مابيسلّمش POSIX signals — Node موثّق إن SIGTERM مش مدعوم عليه،
// و process.kill() بينهي العملية فورًا من غير ما يشغّل الـ handler. فإطلاق
// الحدث جوه العملية بيختبر **منطق التصريف** (readiness تفشل → السوكيتات
// تتقفل → السيرفر يصرّف → الداتابيز تتقفل → خروج 0).
//
// اللي التست ده **مابيختبروش**: تسليم الإشارة من نظام التشغيل. ده بيشتغل على
// Linux (الـ VPS والـ Docker) وبيتأكد هناك. المنطق اللي تحته هو هو.
//
// شغّله (لوحده — بيشغّل السيرفر بنفسه، متشغّلش واحد تاني على :4000):
//   npx tsx src/tests/shutdown.spec.ts
const results = { pass: 0, fail: 0 };
function check(label: string, ok: boolean, detail = "") {
  results[ok ? "pass" : "fail"]++;
  console.log(`  ${ok ? "✓ PASS" : "✗ FAIL"}  ${label}${detail ? "  →  " + detail : ""}`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const B = "http://localhost:4000";

async function status(path: string): Promise<number> {
  try {
    return (await fetch(B + path)).status;
  } catch {
    return 0; // الاتصال اترفض — يعني البورت اتقفل
  }
}

async function main() {
  console.log("\n=== Graceful shutdown drain logic ===\n");

  await import("../index.js"); // بيشغّل السيرفر
  await sleep(2500);

  check("readyz is 200 before shutdown", (await status("/api/readyz")) === 200);
  check("livez is 200 before shutdown", (await status("/api/livez")) === 200);

  // الخروج بيحصل جوه الـ handler، فبنلقط الكود بدل ما العملية تموت تحتينا
  let exitCode: number | null = null;
  const realExit = process.exit.bind(process);
  // @ts-expect-error — بنستبدل process.exit عن قصد عشان نراقب الكود
  process.exit = (code?: number) => { exitCode ??= code ?? 0; };

  process.emit("SIGTERM" as never);

  // markShuttingDown() بيتنفذ قبل أي await جوه shutdown()، يعني المفروض
  // الـ readiness تكون فشلت فورًا — ده اللي بيخلي الـ LB يوقف الترافيك
  check("readyz flips to 503 immediately on SIGTERM", (await status("/api/readyz")) === 503, "load balancer stops routing");

  await sleep(6000); // أطول من DRAIN_DELAY_MS (3 ثواني) عشان التصريف يخلص

  check("process requested a clean exit (code 0)", exitCode === 0, `exit code = ${exitCode}`);
  check("port is closed after drain", (await status("/api/livez")) === 0, "no longer accepting connections");

  console.log(`\n--- ${results.pass} pass · ${results.fail} fail ---\n`);
  realExit(results.fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error("SUITE ERROR:", e); process.exit(1); });
