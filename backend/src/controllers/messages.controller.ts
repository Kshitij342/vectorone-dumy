import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { parsePagination, buildPaginationMeta } from '../utils/paginate';

/**
 * Format raw Prisma conversation for API response
 */
export function formatConversation(conv: any, currentUserId: string) {
  const otherParticipant = conv.participants?.find((p: any) => p.userId !== currentUserId) || conv.participants?.[0];
  const partnerUser = otherParticipant?.user;

  let partnerName = conv.name;
  let partnerRole = 'User';

  if (!partnerName && partnerUser) {
    if (partnerUser.admin?.fullName) {
      partnerName = partnerUser.admin.fullName;
      partnerRole = 'Admin';
    } else if (partnerUser.faculty?.fullName) {
      partnerName = partnerUser.faculty.fullName;
      partnerRole = 'Faculty';
    } else if (partnerUser.student?.fullName) {
      partnerName = partnerUser.student.fullName;
      partnerRole = 'Student';
    } else {
      partnerName = partnerUser.email || 'Campus Member';
      partnerRole = partnerUser.role || 'User';
    }
  }

  const currentUserParticipant = conv.participants?.find((p: any) => p.userId === currentUserId);
  const lastReadAt = currentUserParticipant?.lastReadAt;

  let unreadCount = 0;
  if (conv.messages && conv.messages.length > 0) {
    if (lastReadAt) {
      unreadCount = conv.messages.filter(
        (m: any) => new Date(m.createdAt) > new Date(lastReadAt) && m.senderId !== currentUserId
      ).length;
    } else {
      unreadCount = conv.messages.filter((m: any) => m.senderId !== currentUserId).length;
    }
  }

  const latestMessage = conv.messages && conv.messages.length > 0
    ? conv.messages[conv.messages.length - 1]
    : null;

  return {
    id: conv.id,
    name: partnerName || 'Campus Member',
    role: partnerRole,
    isGroup: conv.isGroup,
    partnerId: partnerUser?.id || null,
    unreadCount,
    updatedAt: conv.updatedAt,
    lastMessage: latestMessage ? latestMessage.text : '',
    messages: (conv.messages || []).map((m: any) => ({
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
      isSelf: m.senderId === currentUserId,
      from: m.senderId === currentUserId ? 'out' : 'in',
      time: new Date(m.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    }))
  };
}

export async function getConversations(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { skip, take, page: pg, limit: lim } = parsePagination(req.query as Record<string, string>);

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where: { participants: { some: { userId } } },
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
                  faculty: { select: { fullName: true } }
                }
              }
            }
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
                  faculty: { select: { fullName: true } }
                }
              }
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
      }),
      prisma.conversation.count({ where: { participants: { some: { userId } } } })
    ]);

    const formatted = conversations.map((c) => formatConversation(c, userId));

    sendSuccess(res, formatted, 'Conversations fetched', 200, buildPaginationMeta(total, pg, lim));
  } catch (error) {
    sendError(res, 'Failed to fetch conversations', 500);
  }
}

export async function getMessages(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { conversationId } = req.params;
    const { page, limit } = req.query as Record<string, string>;
    const { skip, take, page: pg, limit: lim } = parsePagination({ page, limit });

    // Verify user is a participant or ADMIN
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } }
    });

    if (!participant && req.user?.role !== 'ADMIN') {
      sendError(res, 'You are not part of this conversation', 403);
      return;
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        skip,
        take,
        include: {
          sender: {
            select: {
              id: true,
              email: true,
              student: { select: { fullName: true } },
              admin: { select: { fullName: true } },
              faculty: { select: { fullName: true } }
            }
          }
        }
      }),
      prisma.message.count({ where: { conversationId } })
    ]);

    // Mark as read
    if (participant) {
      await prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { lastReadAt: new Date() }
      }).catch(() => {});
    }

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
      time: new Date(m.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    }));

    sendSuccess(res, formatted, 'Messages fetched', 200, buildPaginationMeta(total, pg, lim));
  } catch (error) {
    sendError(res, 'Failed to fetch messages', 500);
  }
}

export async function sendMessage(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { conversationId, text, content, recipientId } = req.body;
    const messageText = (text || content || '').trim();

    if (!messageText) {
      sendError(res, 'Message text is required', 400);
      return;
    }

    let convId = conversationId;

    // Create conversation if not specified (DM)
    if (!convId && recipientId) {
      const existing = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          AND: [
            { participants: { some: { userId } } },
            { participants: { some: { userId: recipientId } } }
          ]
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

    if (!convId) {
      sendError(res, 'conversationId or recipientId required', 400);
      return;
    }

    // Verify user is a participant or ADMIN
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: convId, userId } }
    });

    if (!participant && req.user?.role !== 'ADMIN') {
      // Auto-join admin if messaging in admin capacity
      await prisma.conversationParticipant.create({
        data: { conversationId: convId, userId }
      }).catch(() => {});
    }

    const message = await prisma.message.create({
      data: { conversationId: convId, senderId: userId, text: messageText },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            student: { select: { fullName: true } },
            admin: { select: { fullName: true } },
            faculty: { select: { fullName: true } }
          }
        }
      }
    });

    // Update conversation timestamp
    await prisma.conversation.update({ where: { id: convId }, data: { updatedAt: new Date() } });

    // Emit Socket.IO message if available
    const io = req.app.get('io');
    if (io) {
      const payload = {
        id: message.id,
        conversationId: convId,
        senderId: userId,
        senderName:
          message.sender?.admin?.fullName ||
          message.sender?.faculty?.fullName ||
          message.sender?.student?.fullName ||
          message.sender?.email ||
          'User',
        text: message.text,
        createdAt: message.createdAt,
        time: new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
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

export async function markConversationRead(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { conversationId } = req.params;
    await prisma.conversationParticipant.updateMany({
      where: { conversationId, userId },
      data: { lastReadAt: new Date() }
    });
    sendSuccess(res, null, 'Marked as read');
  } catch (error) {
    sendError(res, 'Failed to mark as read', 500);
  }
}

export async function getContacts(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const users = await prisma.user.findMany({
      where: { id: { not: userId } },
      select: {
        id: true,
        email: true,
        role: true,
        student: { select: { fullName: true } },
        admin: { select: { fullName: true } },
        faculty: { select: { fullName: true } }
      },
      take: 50
    });

    const formatted = users.map((u) => ({
      id: u.id,
      name: u.admin?.fullName || u.faculty?.fullName || u.student?.fullName || u.email,
      role: u.role,
      email: u.email
    }));

    sendSuccess(res, formatted, 'Contacts fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch contacts', 500);
  }
}
