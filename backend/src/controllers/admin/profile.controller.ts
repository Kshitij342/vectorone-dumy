import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/apiResponse';

export async function getAdminProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    let user = await prisma.user.findUnique({
      where: { id: userId },
      include: { admin: true },
    });

    if (!user) {
      user = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
        include: { admin: true },
      });
    }

    if (!user) {
      sendError(res, 'User record not found', 404);
      return;
    }

    let admin = user.admin;
    if (!admin && user.role === 'ADMIN') {
      admin = await prisma.admin.create({
        data: {
          userId: user.id,
          fullName: 'System Administrator',
        },
      });
    }

    if (!admin) {
      admin = await prisma.admin.findFirst();
    }

    if (!admin) {
      sendError(res, 'Admin profile not found', 404);
      return;
    }

    sendSuccess(res, {
      id: user.id,
      email: user.email,
      fullName: admin.fullName,
      avatarUrl: admin.avatarUrl || null,
      role: user.role,
      adminId: admin.id,
    });
  } catch (error) {
    sendError(res, 'Failed to fetch admin profile', 500);
  }
}

export async function updateAdminProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { fullName, name, email, avatarUrl } = req.body;
    const newName = (fullName || name || '').trim();

    let user = await prisma.user.findUnique({
      where: { id: userId },
      include: { admin: true },
    });

    if (!user) {
      user = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
        include: { admin: true },
      });
    }

    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    let admin = user.admin;
    if (!admin) {
      admin = await prisma.admin.create({
        data: {
          userId: user.id,
          fullName: newName || 'System Administrator',
        },
      });
    } else if (newName) {
      admin = await prisma.admin.update({
        where: { id: admin.id },
        data: {
          fullName: newName,
          avatarUrl: avatarUrl !== undefined ? avatarUrl : admin.avatarUrl,
        },
      });
    }

    let updatedEmail = user.email;
    if (email && typeof email === 'string' && email.trim() && email.trim() !== user.email) {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { email: email.trim() },
      });
      updatedEmail = updatedUser.email;
    }

    sendSuccess(res, {
      id: user.id,
      email: updatedEmail,
      fullName: admin.fullName,
      avatarUrl: admin.avatarUrl || null,
      role: user.role,
      adminId: admin.id,
    }, 'Profile updated successfully');
  } catch (error: any) {
    sendError(res, error?.message || 'Failed to update profile', 500);
  }
}
