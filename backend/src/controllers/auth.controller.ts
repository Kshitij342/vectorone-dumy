import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';
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

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
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
        email: normalizedEmail,
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
    const normalizedEmail = email ? email.toLowerCase().trim() : '';

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
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
 * POST /api/auth/google
 * Authenticates user via Google OAuth ID token credential.
 */
export async function googleAuth(req: Request, res: Response): Promise<void> {
  try {
    const { credential, idToken } = req.body;
    const tokenToVerify = credential || idToken;

    if (!tokenToVerify) {
      sendError(res, 'Google credential token is required', 400);
      return;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      sendError(res, 'Google OAuth is not configured on the server (missing GOOGLE_CLIENT_ID)', 500);
      return;
    }

    const client = new OAuth2Client(clientId);
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: tokenToVerify,
        audience: clientId,
      });
    } catch (err: any) {
      sendError(res, `Invalid Google credential token: ${err.message || err}`, 401);
      return;
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      sendError(res, 'Invalid Google token payload', 401);
      return;
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase().trim();
    const fullName = payload.name || payload.given_name || email.split('@')[0];
    const picture = payload.picture;

    // Check if user exists by googleId or email
    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
      include: {
        student: { include: { department: true } },
        admin: true,
        faculty: true,
      }
    });

    if (user) {
      // Link googleId if missing
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId },
          include: {
            student: { include: { department: true } },
            admin: true,
            faculty: true,
          }
        });
      }
    } else {
      // Create new STUDENT account (NEVER ADMIN)
      let defaultDept = await prisma.department.findFirst();
      if (!defaultDept) {
        defaultDept = await prisma.department.create({
          data: {
            deptId: 'DEP-GEN',
            name: 'General Science & Humanities',
          }
        });
      }

      // Generate unique student ID
      const randomDigits = Math.floor(100000 + Math.random() * 900000);
      const studentId = `VO-G${randomDigits}`;

      const randomPassword = crypto.randomBytes(16).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, 12);

      user = await prisma.user.create({
        data: {
          email,
          googleId,
          passwordHash,
          role: Role.STUDENT,
          student: {
            create: {
              studentId,
              fullName,
              year: 1,
              semester: 1,
              division: 'A',
              avatarUrl: picture,
              departmentId: defaultDept.id,
            }
          },
          settings: { create: {} }
        },
        include: {
          student: { include: { department: true } },
          admin: true,
          faculty: true,
        }
      });
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
        avatarUrl: picture || user.student?.avatarUrl || user.admin?.avatarUrl,
        ...profile,
      }
    }, 'Google authentication successful');
  } catch (err: any) {
    sendError(res, 'Google authentication failed: ' + (err.message || err), 500);
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
 * Generates password reset token and sends email via Nodemailer if SMTP configured.
 */
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    if (!email) {
      sendError(res, 'Email is required', 400);
      return;
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      // Do not reveal whether user exists to prevent enumeration
      sendSuccess(res, null, 'If that email exists, a reset link has been sent.');
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: tokenHash,
        resetPasswordExpires: expires,
      }
    });

    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_PORT === '465',
        auth: { user: smtpUser, pass: smtpPass },
      });

      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password.html?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.SMTP_FROM || 'noreply@vectorone.edu',
        to: user.email,
        subject: 'VectorOne — Password Reset Request',
        html: `<p>Hello,</p>
               <p>You requested a password reset for your VectorOne account.</p>
               <p>Click the link below to set a new password (valid for 1 hour):</p>
               <p><a href="${resetUrl}">${resetUrl}</a></p>
               <p>If you did not request this, please ignore this email.</p>`,
      });

      sendSuccess(res, null, 'If that email exists, a reset link has been sent.');
    } else {
      console.warn('[FORGOT PASSWORD] SMTP credentials are not configured. Reset token (dev mode):', resetToken);
      sendSuccess(res, { debugToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined }, 'If that email exists, a reset link has been sent. (Server: SMTP not configured)');
    }
  } catch (err: any) {
    console.error('Forgot password error:', err);
    sendError(res, 'Failed to process forgot password request', 500);
  }
}

/**
 * POST /api/auth/reset-password
 * Resets user password given valid token and email.
 */
export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) {
      sendError(res, 'Email, token, and new password are required', 400);
      return;
    }

    if (newPassword.length < 6) {
      sendError(res, 'Password must be at least 6 characters long', 400);
      return;
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        OR: [
          { resetPasswordToken: tokenHash },
          { resetPasswordToken: token }
        ],
        resetPasswordExpires: { gte: new Date() }
      }
    });

    if (!user) {
      sendError(res, 'Invalid or expired password reset token', 400);
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      }
    });

    sendSuccess(res, null, 'Password reset successfully. Please log in with your new password.');
  } catch (err: any) {
    console.error('Reset password error:', err);
    sendError(res, 'Failed to reset password', 500);
  }
}
