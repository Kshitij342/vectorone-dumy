import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { parsePagination, buildPaginationMeta } from '../utils/paginate';

export async function getConversations(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { skip, take, page: pg, limit: lim } = parsePagination(req.query as Record<string, string>);

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where: { participants: { some: { userId } } },
        include: {
          participants: { include: { user: { select: { id: true, email: true, student: { select: { fullName: true } }, admin: { select: { fullName: true } }, faculty: { select: { fullName: true } } } } } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
      }),
      prisma.conversation.count({ where: { participants: { some: { userId } } } })
    ]);

    sendSuccess(res, conversations, 'Conversations fetched', 200, buildPaginationMeta(total, pg, lim));
  } catch {
    sendError(res, 'Failed to fetch conversations', 500);
  }
}

export async function getMessages(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { conversationId } = req.params;
    const { page, limit } = req.query as Record<string, string>;
    const { skip, take, page: pg, limit: lim } = parsePagination({ page, limit });

    // Verify user is a participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } }
    });
    if (!participant) { sendError(res, 'You are not part of this conversation', 403); return; }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        skip,
        take,
        include: {
          sender: {
            select: { id: true, email: true, student: { select: { fullName: true } }, admin: { select: { fullName: true } }, faculty: { select: { fullName: true } } }
          }
        }
      }),
      prisma.message.count({ where: { conversationId } })
    ]);

    // Mark as read
    await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() }
    });

    sendSuccess(res, messages, 'Messages fetched', 200, buildPaginationMeta(total, pg, lim));
  } catch {
    sendError(res, 'Failed to fetch messages', 500);
  }
}

export async function sendMessage(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { conversationId, text, recipientId } = req.body;

    let convId = conversationId;

    // Create conversation if not specified (DM)
    if (!convId && recipientId) {
      // Check existing DM
      const existing = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          participants: { every: { userId: { in: [userId, recipientId] } } }
        }
      });

      if (existing) {
        convId = existing.id;
      } else {
        const conv = await prisma.conversation.create({
          data: {
            isGroup: false,
            participants: {
              create: [{ userId }, { userId: recipientId }]
            }
          }
        });
        convId = conv.id;
      }
    }

    if (!convId) { sendError(res, 'conversationId or recipientId required', 400); return; }

    const message = await prisma.message.create({
      data: { conversationId: convId, senderId: userId, text },
      include: {
        sender: { select: { id: true, email: true, student: { select: { fullName: true } }, admin: { select: { fullName: true } } } }
      }
    });

    // Update conversation timestamp
    await prisma.conversation.update({ where: { id: convId }, data: { updatedAt: new Date() } });

    sendSuccess(res, message, 'Message sent', 201);
  } catch {
    sendError(res, 'Failed to send message', 500);
  }
}

export async function markConversationRead(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { conversationId } = req.params;
    await prisma.conversationParticipant.updateMany({
      where: { conversationId, userId },
      data: { lastReadAt: new Date() }
    });
    sendSuccess(res, null, 'Marked as read');
  } catch {
    sendError(res, 'Failed to mark as read', 500);
  }
}
