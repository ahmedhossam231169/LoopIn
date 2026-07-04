import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { Errors } from "../lib/errors.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { requireAuth } from "../middleware/auth.js";

export const conversationsRouter = Router();

const startConversationSchema = z.object({
  username: z.string().min(1, "Username is required"),
});

const participantSelect = {
  user: {
    select: {
      id: true,
      username: true,
      profile: { select: { displayName: true, avatarUrl: true, headline: true } },
    },
  },
} as const;

// الشكل الراجع من الـ select — types صريحة عشان الاتساق
interface ParticipantShape {
  user: {
    id: string;
    username: string;
    profile: { displayName: string; avatarUrl: string | null; headline: string | null } | null;
  };
}
interface ConversationRow {
  id: string;
  updatedAt: Date;
  participants: ParticipantShape[];
  messages: { body: string; senderId: string; codeContent: string | null; createdAt: Date }[];
}

// ---------------------------------------------------------------
// GET /api/conversations — كل محادثات المستخدم مرتبة بآخر نشاط
// ---------------------------------------------------------------
conversationsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;

    const conversations = await prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        updatedAt: true,
        participants: { select: participantSelect },
        // آخر رسالة بس — للـ preview في القايمة الشمال
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { body: true, senderId: true, codeContent: true, createdAt: true },
        },
      },
    });

    // بنرجّع "الطرف التاني" جاهز بدل ما الـ client يفلتر بنفسه
    const shaped = (conversations as ConversationRow[]).map((c) => {
      const other = c.participants.find((p: ParticipantShape) => p.user.id !== userId)?.user ?? null;
      const last = c.messages[0] ?? null;
      return {
        id: c.id,
        updatedAt: c.updatedAt,
        other,
        lastMessage: last
          ? {
              preview: last.codeContent ? "📎 Code snippet" : last.body,
              mine: last.senderId === userId,
              createdAt: last.createdAt,
            }
          : null,
      };
    });

    res.json({ ok: true, conversations: shaped });
  })
);

// ---------------------------------------------------------------
// POST /api/conversations — ابدأ (أو رجّع) محادثة مع مستخدم بالـ username
// find-or-create: لو في محادثة بينكم بالفعل بنرجعها بدل ما نكرر
// ---------------------------------------------------------------
conversationsRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { username } = startConversationSchema.parse(req.body);
    const me = req.user!.userId;

    const other = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!other) throw Errors.notFound("User");
    if (other.id === me) throw Errors.badRequest("You can't message yourself");

    const existing = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: me } } },
          { participants: { some: { userId: other.id } } },
        ],
      },
      select: { id: true },
    });

    if (existing) {
      return res.json({ ok: true, conversationId: existing.id, created: false });
    }

    const conversation = await prisma.conversation.create({
      data: {
        participants: { create: [{ userId: me }, { userId: other.id }] },
      },
      select: { id: true },
    });

    res.status(201).json({ ok: true, conversationId: conversation.id, created: true });
  })
);

// ---------------------------------------------------------------
// GET /api/conversations/:id/messages — آخر 50 رسالة
// ---------------------------------------------------------------
conversationsRouter.get(
  "/:id/messages",
  requireAuth,
  asyncHandler(async (req, res) => {
    const conversationId = req.params.id!;
    const userId = req.user!.userId;

    // أمان: لازم تكون طرف في المحادثة عشان تقرأها
    const membership = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!membership) throw Errors.forbidden("You're not part of this conversation");

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: {
        id: true,
        senderId: true,
        body: true,
        codeLanguage: true,
        codeContent: true,
        createdAt: true,
      },
    });

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { participants: { select: participantSelect } },
    });
    const other =
      (conversation?.participants as ParticipantShape[] | undefined)?.find((p) => p.user.id !== userId)?.user ?? null;

    res.json({ ok: true, messages, other });
  })
);
