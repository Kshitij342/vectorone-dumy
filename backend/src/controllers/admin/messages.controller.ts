import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/apiResponse';

export async function getAdminMessages(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: { some: { userId } },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                student: { select: { fullName: true } },
                faculty: { select: { fullName: true } },
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    sendSuccess(res, conversations);
  } catch (error) {
    sendError(res, 'Failed to fetch admin conversations', 500);
  }
}

export async function getAdminMessagesByConversation(req: Request, res: Response): Promise<void> {
  try {
    const { conversationId } = req.params;

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            admin: { select: { fullName: true } },
            student: { select: { fullName: true } },
            faculty: { select: { fullName: true } },
          },
        },
      },
    });

    sendSuccess(res, messages);
  } catch (error) {
    sendError(res, 'Failed to fetch messages for conversation', 500);
  }
}

export async function sendAdminMessage(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { conversationId, text, recipientId } = req.body;

    let convId = conversationId;
    if (!convId && recipientId) {
      const conv = await prisma.conversation.create({
        data: {
          isGroup: false,
          participants: {
            create: [{ userId }, { userId: recipientId }],
          },
        },
      });
      convId = conv.id;
    }

    if (!convId) {
      sendError(res, 'conversationId or recipientId is required', 400);
      return;
    }

    const message = await prisma.message.create({
      data: {
        conversationId: convId,
        senderId: userId,
        text,
      },
      include: {
        sender: { select: { email: true, admin: true } },
      },
    });

    await prisma.conversation.update({
      where: { id: convId },
      data: { updatedAt: new Date() },
    });

    sendSuccess(res, message, 'Message sent', 201);
  } catch (error) {
    sendError(res, 'Failed to send message', 500);
  }
}

export async function broadcastMessage(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { title, text, targetAudience } = req.body;

    const broadcastConv = await prisma.conversation.create({
      data: {
        name: title || 'Campus Announcement',
        isGroup: true,
        participants: {
          create: [{ userId }],
        },
      },
    });

    const message = await prisma.message.create({
      data: {
        conversationId: broadcastConv.id,
        senderId: userId,
        text,
      },
    });

    // Create notifications for all students
    const students = await prisma.student.findMany({ select: { userId: true } });
    if (students.length > 0) {
      await prisma.notification.createMany({
        data: students.map((s) => ({
          userId: s.userId,
          text: `[Announcement] ${title || 'Notice'}: ${text.slice(0, 80)}...`,
          type: 'broadcast',
        })),
      });
    }

    sendSuccess(res, message, `Broadcasted to ${targetAudience || 'All Users'}`, 201);
  } catch (error) {
    sendError(res, 'Failed to broadcast message', 500);
  }
}
