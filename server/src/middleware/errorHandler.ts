import type { Request, Response, NextFunction, RequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/errors.js";

// شكل الـ error response الموحد في المشروع كله:
// { ok: false, error: { code, message, details? } }
interface ErrorBody {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// wrapper بيلقط أي error في الـ async routes ويبعته للـ handler
// من غيره: أي throw جوه async route هيعمل unhandled rejection
export const asyncHandler =
  (fn: RequestHandler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// 404 لأي route مش موجود
export function notFoundHandler(req: Request, res: Response) {
  const body: ErrorBody = {
    ok: false,
    error: { code: "NOT_FOUND", message: `Route ${req.method} ${req.path} not found` },
  };
  res.status(404).json(body);
}

// الـ middleware المركزي — لازم يتسجل آخر حاجة في app.use
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // 1) أخطاء متوقعة رمناها بنفسنا
  if (err instanceof AppError) {
    const body: ErrorBody = {
      ok: false,
      error: { code: err.code, message: err.message, details: err.details },
    };
    return res.status(err.statusCode).json(body);
  }

  // 2) أخطاء الـ validation من Zod — بنرجع تفاصيل مفيدة للمبرمج
  if (err instanceof ZodError) {
    const body: ErrorBody = {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: err.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
    };
    return res.status(422).json(body);
  }

  // 3) أي حاجة غير متوقعة — بنسجلها كاملة في اللوج
  //    وبنرجع للمستخدم رسالة عامة من غير ما نسرّب تفاصيل داخلية
  console.error(`[ERROR] ${req.method} ${req.path}`, err);
  const body: ErrorBody = {
    ok: false,
    error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
  };
  return res.status(500).json(body);
}
