import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { signToken } from '../config/jwt';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { Role } from '@prisma/client';

/**
 * POST /api/auth/register
 * Registers a new STUDENT account.
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { fullName, email, studentId, year, department, password, role } = req.body;

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      sendError(res, 'Email is already registered', 409);
      return;
    }

    // Check studentId uniqueness
    const existingStudentId = await prisma.student.findUnique({ where: { studentId } });
    if (existingStudentId) {
      sendError(res, 'Student ID is already registered', 409);
      return;
    }

    // Resolve department
    const dept = await prisma.department.findFirst({
      where: { name: { contains: department, mode: 'insensitive' } }
    });
    if (!dept) {
      sendError(res, 'Department not found', 400);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Determine role — default to STUDENT; only allow ADMIN via secret flag (for seeding)
    const userRole: Role = (role === 'ADMIN' && process.env.ALLOW_ADMIN_REGISTER === 'true')
      ? Role.ADMIN
      : Role.STUDENT;

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: userRole,
        student: {
          create: {
            studentId,
            fullName,
            year: parseInt(year, 10) || 1,
            semester: (parseInt(year, 10) * 2) - 1 || 1,
            division: 'A',
            departmentId: dept.id,
          }
        },
        settings: { create: {} }
      },
      include: { student: true }
    });

    const token = signToken({ userId: user.id, role: user.role, email: user.email });

    sendSuccess(res, {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.student?.fullName,
        studentId: user.student?.studentId,
      }
    }, 'Registration successful', 201);
  } catch (err) {
    sendError(res, 'Registration failed', 500);
  }
}

/**
 * POST /api/auth/login
 * Authenticates student or admin.
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, role } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        student: { include: { department: true } },
        admin: true,
        faculty: true,
      }
    });

    if (!user) {
      sendError(res, 'Invalid email or password', 401);
      return;
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      sendError(res, 'Invalid email or password', 401);
      return;
    }

    // Role check — if frontend specifies role, validate it
    if (role === 'admin' && user.role !== Role.ADMIN) {
      sendError(res, 'You are not registered as an administrator', 403);
      return;
    }
    if (role === 'student' && user.role !== Role.STUDENT) {
      sendError(res, 'You are not registered as a student', 403);
      return;
    }

    const token = signToken({ userId: user.id, role: user.role, email: user.email });

    const profile =
      user.role === Role.STUDENT
        ? { fullName: user.student?.fullName, studentId: user.student?.studentId, department: user.student?.department?.name }
        : { fullName: user.admin?.fullName };

    sendSuccess(res, {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        ...profile,
      }
    }, 'Login successful');
  } catch {
    sendError(res, 'Login failed', 500);
  }
}

/**
 * POST /api/auth/logout
 * Client should discard the JWT. We return 200 for symmetry.
 */
export function logout(_req: Request, res: Response): void {
  sendSuccess(res, null, 'Logged out successfully');
}

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 */
export async function me(req: Request, res: Response): Promise<void> {
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

    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    sendSuccess(res, {
      id: user.id,
      email: user.email,
      role: user.role,
      student: user.student,
      admin: user.admin,
      faculty: user.faculty,
    });
  } catch {
    sendError(res, 'Failed to fetch user', 500);
  }
}

/**
 * POST /api/auth/forgot-password
 * Placeholder — returns 200 to avoid user enumeration.
 */
export function forgotPassword(_req: Request, res: Response): void {
  sendSuccess(res, null, 'If that email exists, a reset link has been sent.');
}

/**
 * POST /api/auth/reset-password
 * Placeholder — real implementation would validate a signed token.
 */
export function resetPassword(_req: Request, res: Response): void {
  sendSuccess(res, null, 'Password reset successfully. Please log in with your new password.');
}
