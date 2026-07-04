import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { Errors } from "../lib/errors.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { requireAuth } from "../middleware/auth.js";

export const notificationsRouter = Router();

// ---------------------------------------------------------------
// GET /api/notifications — آخر 30 إشعار + عدد الغير مقروء
// ---------------------------------------------------------------
notificationsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: { id: true, type: true, message: true, link: true, read: true, createdAt: true },
      }),
      prisma.notification.count({ where: { userId, read: false } }),
    ]);

    res.json({ ok: true, notifications, unreadCount });
  })
);

// ---------------------------------------------------------------
// POST /api/notifications/:id/read
// ---------------------------------------------------------------
notificationsRouter.post(
  "/:id/read",
  requireAuth,
  asyncHandler(async (req, res) => {
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id! } });
    if (!notification || notification.userId !== req.user!.userId) {
      throw Errors.notFound("Notification");
    }
    await prisma.notification.update({ where: { id: req.params.id! }, data: { read: true } });
    res.json({ ok: true });
  })
);

// ---------------------------------------------------------------
// POST /api/notifications/read-all
// ---------------------------------------------------------------
notificationsRouter.post(
  "/read-all",
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { userId: req.user!.userId, read: false },
      data: { read: true },
    });
    res.json({ ok: true });
  })
);
