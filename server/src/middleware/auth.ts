import type { Request, Response, NextFunction } from "express";
import { verifyToken, type TokenPayload } from "../lib/jwt.js";
import { Errors } from "../lib/errors.js";

// بنوسّع type بتاع Request عشان req.user يبقى typed في كل مكان
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

// أي route محتاج تسجيل دخول بيستخدم ده
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw Errors.unauthorized("Missing Authorization header");
  }
  req.user = verifyToken(header.slice("Bearer ".length));
  next();
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
