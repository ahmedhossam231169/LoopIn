import jwt from "jsonwebtoken";
import { Errors } from "./errors.js";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  // fail fast — السيرفر ما يشتغلش أصلًا من غير secret
  throw new Error("JWT_SECRET is missing. Add it to your .env file.");
}

export interface TokenPayload {
  userId: string;
  role: "DEVELOPER" | "RECRUITER";
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, JWT_SECRET!) as TokenPayload;
  } catch {
    // expired أو متلاعب فيه — نفس الرد في الحالتين
    throw Errors.unauthorized("Invalid or expired token");
  }
}
