// ---------------------------------------------------------------
// نظام الأخطاء المركزي — كل error في المشروع بيعدي من هنا
// الهدف: رسائل موحدة + status codes صح + مفيش crash عشوائي
// ---------------------------------------------------------------

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Shortcuts جاهزة للاستخدام في أي route
export const Errors = {
  badRequest: (msg = "Invalid request", details?: unknown) =>
    new AppError(400, "BAD_REQUEST", msg, details),

  unauthorized: (msg = "Authentication required") =>
    new AppError(401, "UNAUTHORIZED", msg),

  forbidden: (msg = "You don't have permission to do this") =>
    new AppError(403, "FORBIDDEN", msg),

  notFound: (resource = "Resource") =>
    new AppError(404, "NOT_FOUND", `${resource} not found`),

  conflict: (msg = "Resource already exists") =>
    new AppError(409, "CONFLICT", msg),

  validation: (details: unknown) =>
    new AppError(422, "VALIDATION_ERROR", "Validation failed", details),

  internal: (msg = "Something went wrong") =>
    new AppError(500, "INTERNAL_ERROR", msg),
};
