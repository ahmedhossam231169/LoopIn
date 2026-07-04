import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";
import { Errors } from "../lib/errors.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { registerSchema, loginSchema } from "../schemas/auth.js";
import { getAllowedOrigins } from "../lib/cors.js";

export const authRouter = Router();

// اللي بنرجعه للـ client عن المستخدم — من غير passwordHash أبدًا
const publicUserSelect = {
  id: true,
  email: true,
  username: true,
  role: true,
  createdAt: true,
  profile: {
    select: { displayName: true, avatarUrl: true, headline: true },
  },
} as const;

// ---------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------
authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    // .parse بترمي ZodError لو في مشكلة → errorHandler بيحولها 422 تلقائي
    const input = registerSchema.parse(req.body);

    // فحص التكرار قبل الإنشاء عشان نرجع رسالة واضحة بدل DB error خام
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: input.email }, { username: input.username }] },
      select: { email: true, username: true },
    });
    if (existing) {
      throw Errors.conflict(
        existing.email === input.email
          ? "An account with this email already exists"
          : "This username is taken"
      );
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    // بننشئ الـ User والـ Profile مع بعض في transaction ضمني (nested create)
    const user = await prisma.user.create({
      data: {
        email: input.email,
        username: input.username,
        passwordHash,
        role: input.role,
        profile: { create: { displayName: input.displayName } },
      },
      select: publicUserSelect,
    });

    const token = signToken({ userId: user.id, role: user.role });
    res.status(201).json({ ok: true, user, token });
  })
);

// ---------------------------------------------------------------
// POST /api/auth/login  (email أو username)
// ---------------------------------------------------------------
authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: input.identifier }, { username: input.identifier }],
      },
    });

    // نفس الرسالة سواء الحساب مش موجود أو الباسورد غلط
    // عشان محدش يعرف يفحص أنهي إيميلات مسجلة عندنا (user enumeration)
    const invalidCreds = Errors.unauthorized("Invalid credentials");
    if (!user || !user.passwordHash) throw invalidCreds;

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) throw invalidCreds;

    const publicUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: publicUserSelect,
    });

    const token = signToken({ userId: user.id, role: user.role });
    res.json({ ok: true, user: publicUser, token });
  })
);

// ---------------------------------------------------------------
// GET /api/auth/me — بيانات صاحب التوكن الحالي
// ---------------------------------------------------------------
authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: publicUserSelect,
    });
    if (!user) throw Errors.unauthorized("Account no longer exists");
    res.json({ ok: true, user });
  })
);

// ---------------------------------------------------------------
// GitHub OAuth — خطوتين:
// 1) /github → بنحوّل المستخدم لصفحة GitHub
// 2) /github/callback → GitHub بيرجعنا بـ code، بنبدله بـ access token
//    وبنجيب بيانات المستخدم وبنعمل login أو نسجّله جديد
// محتاج GITHUB_CLIENT_ID و GITHUB_CLIENT_SECRET في الـ .env
// ---------------------------------------------------------------
authRouter.get("/github", (_req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) throw Errors.internal("GitHub OAuth is not configured");

  const params = new URLSearchParams({
    client_id: clientId,
    scope: "read:user user:email",
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  email: string | null;
}

authRouter.get(
  "/github/callback",
  asyncHandler(async (req, res) => {
    const code = String(req.query.code ?? "");
    if (!code) throw Errors.badRequest("Missing OAuth code");

    // 1) بدل الـ code بـ access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenData.access_token) throw Errors.unauthorized("GitHub authorization failed");

    // 2) هات بيانات المستخدم من GitHub API
    const ghRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const gh = (await ghRes.json()) as GitHubUser;

    // 3) لو مسجّل قبل كده → login. لو جديد → أنشئ حساب
    let user = await prisma.user.findUnique({ where: { githubId: String(gh.id) } });

    if (!user) {
      const email = gh.email ?? `${gh.login}@users.noreply.github.com`;
      user = await prisma.user.create({
        data: {
          email,
          username: gh.login,
          githubId: String(gh.id),
          role: "DEVELOPER",
          profile: {
            create: {
              displayName: gh.name ?? gh.login,
              avatarUrl: gh.avatar_url,
              githubUrl: `https://github.com/${gh.login}`,
            },
          },
        },
      });
    }

    const token = signToken({ userId: user.id, role: user.role });
    // بنرجّع المستخدم للـ frontend والتوكن في الـ URL (الـ client هيلقطه ويخزنه)
    // ده رابط redirect فعلي (مش CORS whitelist)، فبناخد أول دومين مسموح بس
    const clientUrl = getAllowedOrigins()[0];
    res.redirect(`${clientUrl}/auth/callback?token=${token}`);
  })
);
