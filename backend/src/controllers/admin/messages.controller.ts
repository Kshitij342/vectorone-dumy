import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { formatConversation } from '../messages.controller';

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
                role: true,
                student: { select: { fullName: true } },
                admin: { select: { fullName: true } },
                faculty: { select: { fullName: true } },
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                email: true,
                student: { select: { fullName: true } },
                admin: { select: { fullName: true } },
                faculty: { select: { fullName: true } },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const formatted = conversations.map((c) => formatConversation(c, userId));

    sendSuccess(res, formatted, 'Admin conversations fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch admin conversations', 500);
  }
}

export async function getAdminMessagesByConversation(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
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

    // Mark as read
    await prisma.conversationParticipant.updateMany({
      where: { conversationId, userId },
      data: { lastReadAt: new Date() },
    }).catch(() => {});

    const formatted = messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      senderName:
        m.sender?.admin?.fullName ||
        m.sender?.faculty?.fullName ||
        m.sender?.student?.fullName ||
        m.sender?.email ||
        'User',
      text: m.text,
      createdAt: m.createdAt,
      isSelf: m.senderId === userId,
      from: m.senderId === userId ? 'out' : 'in',
      time: new Date(m.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    }));

    sendSuccess(res, formatted);
  } catch (error) {
    sendError(res, 'Failed to fetch messages for conversation', 500);
  }
}

export async function sendAdminMessage(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { conversationId, text, content, recipientId } = req.body;
    const messageText = (text || content || '').trim();

    if (!messageText) {
      sendError(res, 'Message text is required', 400);
      return;
    }

    let convId = conversationId;

    if (!convId && recipientId) {
      const existing = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          AND: [
            { participants: { some: { userId } } },
            { participants: { some: { userId: recipientId } } },
          ],
        },
      });

      if (existing) {
        convId = existing.id;
      } else {
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
    }

    if (!convId) {
      sendError(res, 'conversationId or recipientId is required', 400);
      return;
    }

    // Ensure admin is participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: convId, userId } },
    });

    if (!participant) {
      await prisma.conversationParticipant.create({
        data: { conversationId: convId, userId },
      }).catch(() => {});
    }

    const message = await prisma.message.create({
      data: {
        conversationId: convId,
        senderId: userId,
        text: messageText,
      },
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

    await prisma.conversation.update({
      where: { id: convId },
      data: { updatedAt: new Date() },
    });

    // Emit Socket.IO message if available
    const io = req.app.get('io');
    if (io) {
      const payload = {
        id: message.id,
        conversationId: convId,
        senderId: userId,
        senderName: message.sender?.admin?.fullName || message.sender?.email || 'Admin',
        text: message.text,
        createdAt: message.createdAt,
        time: new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      };
      io.to(`conv:${convId}`).emit('message:received', payload);
      if (recipientId) {
        io.to(`user:${recipientId}`).emit('message:received', payload);
      }
    }

    sendSuccess(res, message, 'Message sent', 201);
  } catch (error) {
    sendError(res, 'Failed to send message', 500);
  }
}

export async function broadcastMessage(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { title, text, content, targetAudience } = req.body;
    const messageText = (text || content || '').trim();

    if (!messageText) {
      sendError(res, 'Broadcast text is required', 400);
      return;
    }

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
        text: messageText,
      },
    });

    // Create notifications for all students
    const students = await prisma.student.findMany({ select: { userId: true } });
    if (students.length > 0) {
      await prisma.notification.createMany({
        data: students.map((s) => ({
          userId: s.userId,
          text: `[Announcement] ${title || 'Notice'}: ${messageText.slice(0, 80)}...`,
          type: 'broadcast',
        })),
      });
    }

    // Emit socket event for announcement
    const io = req.app.get('io');
    if (io) {
      io.emit('broadcast:received', {
        title: title || 'Campus Announcement',
        text: messageText,
        createdAt: message.createdAt,
      });
    }

    sendSuccess(res, message, `Broadcasted to ${targetAudience || 'All Users'}`, 201);
  } catch (error) {
    sendError(res, 'Failed to broadcast message', 500);
  }
}
