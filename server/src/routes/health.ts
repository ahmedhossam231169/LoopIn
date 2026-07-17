// ---------------------------------------------------------------
// فحوصات الصحة — التفرقة بين الاتنين مش شكلية:
//
//   /api/livez  — "العملية عايشة؟" مابيلمسش أي dependency. لو رجّع فشل يبقى
//                 الحل الوحيد إعادة تشغيل العملية. مايتعملوش فحص للداتابيز
//                 عن قصد: لو الداتابيز وقعت، إعادة تشغيل التطبيق مش هتصلّح
//                 حاجة — هتعمل crash loop بس.
//
//   /api/readyz — "أقدر أخدم طلبات دلوقتي؟" بيفحص الداتابيز فعلاً. الـ load
//                 balancer بيستخدمه عشان يوقف الترافيك عن instance مكسورة
//                 من غير ما يقتلها.
//
//   /api/health — الموجود من قبل، ساكت وثابت. مستخدم في الكلاينت/المراقبة
//                 فمسبناه زي ما هو للتوافق.
//
// ⚠️ الراوتر ده لازم يتسجّل **قبل** apiLimiter في index.ts. الـ load balancer
// بيسأل كل ثانيتين-خمسة، يعني 300 طلب/15 دقيقة كانت هتخلص في أقل من ساعة
// وبعدها كل الفحوصات تاخد 429 والـ LB يشيل السيرفر من الخدمة وهو سليم.
// ---------------------------------------------------------------
import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const healthRouter = Router();

// بيتقلب أول ما يوصل SIGTERM — الـ readiness بتفشل فورًا فالـ LB يوقف
// الترافيك الجديد بينما الطلبات اللي شغالة بتخلص
let shuttingDown = false;
export function markShuttingDown() {
  shuttingDown = true;
}

// فحص الداتابيز متكاش لثانيتين. السبب: الـ endpoint ده قبل الـ rate limiter
// (لازم يكون كده — شوف فوق)، فمن غير الكاش أي حد يقدر يحوّل كل طلب لـ query
// على الداتابيز ويستنزفها. الـ LB بيسأل كل ثواني، فثانيتين كاش مابيأخروش.
const CACHE_MS = 2000;
let cached: { at: number; ok: boolean; error?: string } | null = null;

async function checkDatabase(): Promise<{ ok: boolean; error?: string }> {
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return { ok: cached.ok, ...(cached.error ? { error: cached.error } : {}) };
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    cached = { at: Date.now(), ok: true };
    return { ok: true };
  } catch (err) {
    // الرسالة الخام ممكن تحتوي على بيانات الاتصال — مابنسربهاش في رد عام
    const error = err instanceof Error ? err.name : "unknown error";
    cached = { at: Date.now(), ok: false, error };
    return { ok: false, error };
  }
}

/** liveness: العملية بترد؟ مفيش فحص dependencies عن قصد */
healthRouter.get("/livez", (_req, res) => {
  res.json({ ok: true, status: "alive", uptime: Math.round(process.uptime()) });
});

/** readiness: نقدر نخدم ترافيك؟ 503 لو لأ — عشان الـ LB يوقف التوجيه */
healthRouter.get("/readyz", async (_req, res) => {
  if (shuttingDown) {
    return res.status(503).json({ ok: false, status: "shutting_down", checks: { database: "skipped" } });
  }
  const db = await checkDatabase();
  if (!db.ok) {
    return res.status(503).json({ ok: false, status: "not_ready", checks: { database: `down (${db.error})` } });
  }
  res.json({ ok: true, status: "ready", checks: { database: "up" } });
});

/** الفحص القديم — ثابت، للتوافق مع أي حاجة بتستخدمه بالفعل */
healthRouter.get("/health", (_req, res) => {
  res.json({ ok: true, service: "devconnect-api", time: new Date().toISOString() });
});
