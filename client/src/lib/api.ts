// ---------------------------------------------------------------
// طبقة الـ API الموحدة — كل الطلبات بتعدي من هنا
// بتضيف التوكن تلقائيًا وبتفهم شكل الـ error الموحد من الـ backend
// ---------------------------------------------------------------

// في التطوير المحلي: فاضي، فالطلبات بتتحول لـ /api/* والـ Vite proxy بيوصلها للسيرفر المحلي
// في الإنتاج: بنحط رابط الـ backend الحقيقي (على Render) في متغير بيئة VITE_API_URL
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";
export { API_BASE_URL };

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: unknown;
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
  }

  // helper: يحول تفاصيل Zod لـ map جاهز نعلّق بيه على الحقول
  fieldErrors(): Record<string, string> {
    if (!Array.isArray(this.details)) return {};
    const out: Record<string, string> = {};
    for (const issue of this.details as ValidationIssue[]) {
      if (!out[issue.path]) out[issue.path] = issue.message;
    }
    return out;
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("devconnect_token");

  const res = await fetch(API_BASE_URL + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const err: ApiErrorShape = data?.error ?? { code: "UNKNOWN", message: "Unexpected error" };
    throw new ApiError(res.status, err.code, err.message, err.details);
  }

  return data as T;
}
