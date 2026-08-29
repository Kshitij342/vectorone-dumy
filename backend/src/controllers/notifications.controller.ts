import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendError } from '../utils/apiResponse';

export async function getNotifications(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    const unreadCount = notifications.filter(n => !n.isRead).length;
    sendSuccess(res, { notifications, unreadCount });
  } catch {
    sendError(res, 'Failed to fetch notifications', 500);
  }
}

export async function markRead(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { ids } = req.body as { ids: string[] };
    if (!ids?.length) { sendError(res, 'ids array required', 400); return; }

    await prisma.notification.updateMany({
      where: { id: { in: ids }, userId },
      data: { isRead: true }
    });
    sendSuccess(res, null, 'Marked as read');
  } catch {
    sendError(res, 'Failed to mark notifications', 500);
  }
}

export async function markAllRead(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    await prisma.notification.updateMany({ where: { userId }, data: { isRead: true } });
    sendSuccess(res, null, 'All notifications marked as read');
  } catch {
    sendError(res, 'Failed to mark notifications', 500);
  }
}
