import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken } from '../config/jwt';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

interface AuthenticatedSocket extends Socket {
  user?: {
    userId: string;
    role: string;
    email: string;
  };
}

export function setupSocketIO(io: SocketIOServer): void {
  // Authentication middleware for socket connections
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers['authorization'];
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
      const decoded = verifyToken(cleanToken);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  const onlineUsers = new Map<string, string>(); // userId -> socketId

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.user?.userId;
    if (!userId) return;

    onlineUsers.set(userId, socket.id);
    logger.info(`User connected: ${userId} (${socket.user?.role})`);

    // Broadcast user presence
    io.emit('user:online', { userId });

    // Join a personal room for private notifications
    socket.join(`user:${userId}`);

    // Join a conversation room (with authorization check)
    socket.on('conversation:join', async ({ conversationId }: { conversationId: string }) => {
      try {
        const participant = await prisma.conversationParticipant.findUnique({
          where: { conversationId_userId: { conversationId, userId } }
        });
        if (participant || socket.user?.role === 'ADMIN') {
          socket.join(`conv:${conversationId}`);
        } else {
          socket.emit('error', { message: 'Unauthorized access to conversation' });
        }
      } catch {
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    // Leave conversation room
    socket.on('conversation:leave', ({ conversationId }: { conversationId: string }) => {
      socket.leave(`conv:${conversationId}`);
    });

    // Typing indicator
    socket.on('typing:start', ({ conversationId }: { conversationId: string }) => {
      socket.to(`conv:${conversationId}`).emit('typing:start', {
        userId,
        conversationId,
      });
    });

    socket.on('typing:stop', ({ conversationId }: { conversationId: string }) => {
      socket.to(`conv:${conversationId}`).emit('typing:stop', {
        userId,
        conversationId,
      });
    });

    // Send direct real-time message
    socket.on(
      'message:send',
      async ({
        conversationId,
        text,
      }: {
        conversationId: string;
        text: string;
      }) => {
        try {
          const message = await prisma.message.create({
            data: {
              conversationId,
              senderId: userId,
              text,
            },
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
          });

          await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });

          // Broadcast to everyone in the conversation
          io.to(`conv:${conversationId}`).emit('message:received', message);
        } catch (error) {
          socket.emit('error', { message: 'Failed to send message' });
        }
      }
    );

    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      logger.info(`User disconnected: ${userId}`);
      io.emit('user:offline', { userId });
    });
  });
}
