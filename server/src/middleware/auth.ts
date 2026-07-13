import type { Request, Response, NextFunction } from "express";
import { verifyToken, type TokenPayload } from "../lib/jwt.js";
import { Errors } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";

// بنوسّع type بتاع Request عشان req.user يبقى typed في كل مكان
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

// أي route محتاج تسجيل دخول بيستخدم ده
// [SECURITY BUG-05] بقى async: بعد التحقق من توقيع الـ JWT بنتأكد إن
// tokenVersion اللي جواه لسه مطابق للي في الداتابيز. إعادة تعيين الباسورد
// بتزوّد الرقم، فأي توكن قديم (حتى المسروق) بيترفض هنا فورًا.
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(Errors.unauthorized("Missing Authorization header"));
  }

  let payload: TokenPayload;
  try {
    payload = verifyToken(header.slice("Bearer ".length));
  } catch (err) {
    return next(err);
  }

  prisma.user
    .findUnique({ where: { id: payload.userId }, select: { tokenVersion: true } })
    .then((user) => {
      // مستخدم متمسح، أو التوكن من قبل آخر إعادة تعيين باسورد → مرفوض
      // (?? 0 عشان التوكنات القديمة اللي اتصدرت قبل الميزة تفضل شغّالة لحد أول reset)
      if (!user || user.tokenVersion !== (payload.tokenVersion ?? 0)) {
        return next(Errors.unauthorized("Session expired. Please sign in again."));
      }
      req.user = payload;
      next();
    })
    .catch(next);
}

// guard إضافي للـ routes الخاصة بالـ recruiters بس (هنحتاجه في مرحلة الـ Talent Search)
export function requireRole(role: TokenPayload["role"]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw Errors.unauthorized();
    if (req.user.role !== role) {
      throw Errors.forbidden(`This action requires a ${role} account`);
    }
    next();
  };
}
