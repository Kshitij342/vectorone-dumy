import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendError } from '../utils/apiResponse';

export async function getSettings(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const settings = await prisma.userSetting.upsert({
      where: { userId },
      update: {},
      create: { userId }
    });
    sendSuccess(res, settings);
  } catch {
    sendError(res, 'Failed to fetch settings', 500);
  }
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { assignmentReminders, eventInvites, compactDashboard, showUnreadBadges, emailNotifications, theme, language } = req.body;

    const settings = await prisma.userSetting.upsert({
      where: { userId },
      update: {
        assignmentReminders: assignmentReminders !== undefined ? Boolean(assignmentReminders) : undefined,
        eventInvites: eventInvites !== undefined ? Boolean(eventInvites) : undefined,
        compactDashboard: compactDashboard !== undefined ? Boolean(compactDashboard) : undefined,
        showUnreadBadges: showUnreadBadges !== undefined ? Boolean(showUnreadBadges) : undefined,
        emailNotifications: emailNotifications !== undefined ? Boolean(emailNotifications) : undefined,
        theme: theme || undefined,
        language: language || undefined,
      },
      create: { userId }
    });
    sendSuccess(res, settings, 'Settings updated');
  } catch {
    sendError(res, 'Failed to update settings', 500);
  }
}
