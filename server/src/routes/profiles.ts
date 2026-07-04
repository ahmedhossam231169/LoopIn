import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { Errors } from "../lib/errors.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { updateProfileSchema } from "../schemas/profile.js";

export const profilesRouter = Router();

// شكل موحد للبروفايل الكامل — نفس الشكل في صفحة "المرحلة 5" للمرشح
const fullProfileSelect = {
  id: true,
  displayName: true,
  headline: true,
  bio: true,
  avatarUrl: true,
  location: true,
  yearsExperience: true,
  specialty: true,
  availability: true,
  websiteUrl: true,
  githubUrl: true,
  skills: {
    select: { years: true, skill: { select: { name: true } } },
    orderBy: { years: "desc" },
  },
} as const;

function shapeProfile(p: any) {
  if (!p) return null;
  const { skills, ...rest } = p;
  return {
    ...rest,
    skills: skills.map((s: any) => ({ name: s.skill.name, years: s.years })),
  };
}

// ---------------------------------------------------------------
// GET /api/profiles/me — بروفايلي أنا (عشان صفحة "Edit Profile")
// ---------------------------------------------------------------
profilesRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.user!.userId },
      select: fullProfileSelect,
    });
    if (!profile) throw Errors.notFound("Profile");
    res.json({ ok: true, profile: shapeProfile(profile) });
  })
);

// ---------------------------------------------------------------
// PUT /api/profiles/me — تحديث البروفايل + الـ skills
// ---------------------------------------------------------------
profilesRouter.put(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = updateProfileSchema.parse(req.body);
    const userId = req.user!.userId;
    const { skills, ...scalarFields } = input;

    // 1) تحديث الحقول العادية
    if (Object.keys(scalarFields).length > 0) {
      await prisma.profile.update({ where: { userId }, data: scalarFields });
    }

    // 2) الـ skills: بنمسح القديم ونحط الجديد (بسيط وآمن ضد تكرار)
    //    لكل skill لازم نتأكد إنه موجود في جدول Skill المشترك (upsert) قبل ما نربطه
    if (skills) {
      const profile = await prisma.profile.findUniqueOrThrow({
        where: { userId },
        select: { id: true },
      });

      await prisma.profileSkill.deleteMany({ where: { profileId: profile.id } });

      for (const s of skills) {
        const skill = await prisma.skill.upsert({
          where: { name: s.name },
          update: {},
          create: { name: s.name },
        });
        await prisma.profileSkill.create({
          data: { profileId: profile.id, skillId: skill.id, years: s.years },
        });
      }
    }

    const updated = await prisma.profile.findUnique({
      where: { userId },
      select: fullProfileSelect,
    });
    res.json({ ok: true, profile: shapeProfile(updated) });
  })
);

// ---------------------------------------------------------------
// GET /api/profiles/:username — بروفايل عام (recruiters بيستخدموه لصفحة المرشح)
// ---------------------------------------------------------------
profilesRouter.get(
  "/:username",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username! },
      select: {
        username: true,
        role: true,
        createdAt: true,
        profile: { select: fullProfileSelect },
      },
    });
    if (!user || !user.profile) throw Errors.notFound("Profile");

    res.json({
      ok: true,
      user: { username: user.username, role: user.role, createdAt: user.createdAt },
      profile: shapeProfile(user.profile),
    });
  })
);
