import rateLimit from "express-rate-limit";

// ---------------------------------------------------------------
// الحماية من الـ brute force والإغراق
// الردود بنفس شكل error الموحد بتاع المشروع { ok:false, error:{...} }
// ---------------------------------------------------------------

const standardResponse = (message: string) => ({
  ok: false,
  error: { code: "RATE_LIMITED", message },
});

// صارم: لمحاولات الدخول والتسجيل واستعادة الباسورد
// 10 محاولات كل 15 دقيقة لكل IP — كافي للاستخدام الطبيعي، قاتل للـ brute force
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: standardResponse("Too many attempts. Try again in 15 minutes."),
});

// أخف: لباقي الـ API — 300 طلب كل 15 دقيقة لكل IP
// عالي كفاية للاستخدام العادي (feed, chat...) ومانع للإغراق المتعمد
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: standardResponse("Too many requests. Slow down a little."),
});
