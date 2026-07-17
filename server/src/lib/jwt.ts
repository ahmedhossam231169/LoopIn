import jwt from "jsonwebtoken";
import { Errors } from "./errors.js";
import { config } from "./config.js";

// التحقق (موجود + 32 حرف على الأقل) بيحصل في lib/config.ts وقت تشغيل السيرفر
const JWT_SECRET = config.JWT_SECRET;

export interface TokenPayload {
  userId: string;
  role: "DEVELOPER" | "RECRUITER";
  // [SECURITY BUG-05] لازم يطابق User.tokenVersion وقت التحقق — غير كده التوكن مبطّل
  tokenVersion: number;
}

export function signToken(payload: TokenPayload, expiresIn: "7d" | "30d" = "7d"): string {
  // "30d" لما المستخدم يعلّم "Keep me signed in for 30 days" وقت اللوجين
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    // expired أو متلاعب فيه — نفس الرد في الحالتين
    throw Errors.unauthorized("Invalid or expired token");
  }
}
