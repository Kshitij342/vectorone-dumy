import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendError } from '../utils/apiResponse';
import bcrypt from 'bcryptjs';

export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        student: { include: { department: true } },
        admin: true,
        faculty: { include: { department: true } },
      }
    });
    if (!user) { sendError(res, 'User not found', 404); return; }
    // Never return passwordHash
    const { passwordHash: _, ...safeUser } = user;
    sendSuccess(res, safeUser);
  } catch {
    sendError(res, 'Failed to fetch profile', 500);
  }
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { fullName, phone, avatarUrl, currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) { sendError(res, 'User not found', 404); return; }

    // Password change
    if (newPassword) {
      if (!currentPassword) { sendError(res, 'Current password required', 400); return; }
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) { sendError(res, 'Current password is incorrect', 401); return; }
      const hash = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
    }

    // Update student or admin profile
    if (user.role === 'STUDENT') {
      await prisma.student.update({
        where: { userId },
        data: { fullName: fullName || undefined, phone: phone || undefined, avatarUrl: avatarUrl || undefined }
      });
    } else if (user.role === 'ADMIN') {
      await prisma.admin.update({
        where: { userId },
        data: { fullName: fullName || undefined, avatarUrl: avatarUrl || undefined }
      });
    } else if (user.role === 'FACULTY') {
      await prisma.facultyMember.update({
        where: { userId },
        data: { fullName: fullName || undefined, phone: phone || undefined, avatarUrl: avatarUrl || undefined }
      });
    }

    sendSuccess(res, null, 'Profile updated');
  } catch {
    sendError(res, 'Failed to update profile', 500);
  }
}
