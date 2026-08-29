import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/apiResponse';

export async function getAdminProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { admin: true },
    });

    if (!user || !user.admin) {
      sendError(res, 'Admin profile not found', 404);
      return;
    }

    sendSuccess(res, {
      id: user.id,
      email: user.email,
      fullName: user.admin.fullName,
      avatarUrl: user.admin.avatarUrl,
      role: user.role,
    });
  } catch (error) {
    sendError(res, 'Failed to fetch admin profile', 500);
  }
}

export async function updateAdminProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { fullName, avatarUrl } = req.body;

    const admin = await prisma.admin.update({
      where: { userId },
      data: {
        fullName: fullName || undefined,
        avatarUrl: avatarUrl || undefined,
      },
    });

    sendSuccess(res, admin, 'Profile updated successfully');
  } catch (error) {
    sendError(res, 'Failed to update admin profile', 500);
  }
}
