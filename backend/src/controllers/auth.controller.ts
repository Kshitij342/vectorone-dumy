import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../config/database';
import { signToken } from '../config/jwt';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { Role } from '@prisma/client';
import { isVerifiedCollegeGoogleAccount } from '../utils/emailValidator';

/**
 * POST /api/auth/register
 * Public student registration is disabled. College accounts are provided by your institution.
 */
export async function register(_req: Request, res: Response): Promise<void> {
  sendError(res, 'Public student registration is disabled. College accounts are provided by your institution.', 403);
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

    // Stage 1: credential received
    console.log('[googleAuth] Stage 1: credential present =', !!tokenToVerify);

    if (!tokenToVerify) {
      sendError(res, 'Google credential token is required', 400);
      return;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;

    // Stage 2: server-side client ID check
    console.log('[googleAuth] Stage 2: GOOGLE_CLIENT_ID present =', !!clientId);

    if (!clientId) {
      sendError(res, 'Google OAuth is not configured on the server (missing GOOGLE_CLIENT_ID)', 500);
      return;
    }

    // Stage 3: ID token verification
    console.log('[googleAuth] Stage 3: verifyIdToken starting');
    const client = new OAuth2Client(clientId);
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: tokenToVerify,
        audience: clientId,
      });
      console.log('[googleAuth] Stage 3: verifyIdToken succeeded');
    } catch (err: any) {
      console.error('[googleAuth] Stage 3: verifyIdToken FAILED —', err.message);
      sendError(res, `Invalid Google credential token: ${err.message || err}`, 401);
      return;
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      console.error('[googleAuth] Stage 3: token payload invalid or missing email');
      sendError(res, 'Invalid Google token payload', 401);
      return;
    }

    // Stage 3b: Verify Google email verification status and college domain whitelist
    const verification = isVerifiedCollegeGoogleAccount(payload);
    if (!verification.allowed) {
      console.error('[googleAuth] Stage 3b: Verification rejected —', verification.reason);
      sendError(res, verification.reason || 'Only verified college email addresses are allowed.', 403);
      return;
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase().trim();
    const picture = payload.picture;

    // Stage 4: database user lookup (Roster Verification)
    console.log('[googleAuth] Stage 4: database user lookup');
    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
      include: {
        student: { include: { department: true } },
        admin: true,
        faculty: true,
      }
    });
    console.log('[googleAuth] Stage 4: user found =', !!user, '| role =', user?.role ?? 'none');

    if (!user) {
      console.error('[googleAuth] Stage 4: User not registered in database —', email);
      sendError(res, 'This Google account is not registered with VectorOne. Please use your college account.', 403);
      return;
    }

    // Link googleId if missing
    if (!user.googleId) {
      console.log('[googleAuth] Stage 4a: linking googleId to existing user');
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

    // Stage 6: sign JWT
    console.log('[googleAuth] Stage 6: signing JWT, JWT_SECRET present =', !!process.env.JWT_SECRET);
    const token = signToken({ userId: user.id, role: user.role, email: user.email });
    console.log('[googleAuth] Stage 6: JWT signed successfully');

    // Stage 7: send response
    const profile =
      user.role === Role.STUDENT
        ? { fullName: user.student?.fullName, studentId: user.student?.studentId, department: user.student?.department?.name }
        : { fullName: user.admin?.fullName };

    console.log('[googleAuth] Stage 7: sending success response');
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
    console.error('[googleAuth] UNCAUGHT ERROR —', err.message);
    console.error('[googleAuth] stack —', err.stack);
    sendError(res, 'Google authentication failed: ' + (err.message || String(err)), 500);
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
      sendSuccess(res, null, 'If that email exists, a reset link has been sent.');
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

/**
 * Temporary Endpoint: GET /api/auth/temp-seed-test-accounts?key=temp_vectorone_seed_2026_xyz
 * Populates 6 dedicated test accounts idempotently in production environment.
 */
export async function tempSeedTestAccounts(req: Request, res: Response): Promise<void> {
  try {
    const key = req.query.key || req.headers['x-temp-seed-key'];
    if (key !== 'temp_vectorone_seed_2026_xyz') {
      sendError(res, 'Unauthorized temp seed call', 403);
      return;
    }

    const dept = await prisma.department.findFirst({
      where: { status: 'Active' }
    }) || await prisma.department.findFirst();

    if (!dept) {
      sendError(res, 'No department found in database', 500);
      return;
    }

    const testStudents = [
      { email: 'vectorone.student1@tsecmumbai.in', password: 'VectorStudent@101', studentId: 'VO-TST-001', fullName: 'VectorOne Test Student 1', year: 2, division: 'A', semester: 3 },
      { email: 'vectorone.student2@tsecmumbai.in', password: 'VectorStudent@102', studentId: 'VO-TST-002', fullName: 'VectorOne Test Student 2', year: 2, division: 'B', semester: 3 },
      { email: 'vectorone.student3@tsecmumbai.in', password: 'VectorStudent@103', studentId: 'VO-TST-003', fullName: 'VectorOne Test Student 3', year: 2, division: 'C', semester: 3 },
    ];

    const testAdmins = [
      { email: 'vectorone.admin1@vectorone.edu', password: 'VectorAdmin@101', fullName: 'VectorOne Test Admin 1' },
      { email: 'vectorone.admin2@vectorone.edu', password: 'VectorAdmin@102', fullName: 'VectorOne Test Admin 2' },
      { email: 'vectorone.admin3@vectorone.edu', password: 'VectorAdmin@103', fullName: 'VectorOne Test Admin 3' },
    ];

    let studentsCreated = 0;
    for (const ts of testStudents) {
      const hash = await bcrypt.hash(ts.password, 12);
      const user = await prisma.user.upsert({
        where: { email: ts.email },
        update: { passwordHash: hash, role: Role.STUDENT },
        create: { email: ts.email, passwordHash: hash, role: Role.STUDENT }
      });

      await prisma.student.upsert({
        where: { userId: user.id },
        update: {
          fullName: ts.fullName,
          year: ts.year,
          division: ts.division,
          semester: ts.semester,
          departmentId: dept.id,
          status: 'Active'
        },
        create: {
          userId: user.id,
          studentId: ts.studentId,
          fullName: ts.fullName,
          year: ts.year,
          division: ts.division,
          semester: ts.semester,
          departmentId: dept.id,
          status: 'Active'
        }
      });

      await prisma.userSetting.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id }
      });
      studentsCreated++;
    }

    let adminsCreated = 0;
    for (const ta of testAdmins) {
      const hash = await bcrypt.hash(ta.password, 12);
      const user = await prisma.user.upsert({
        where: { email: ta.email },
        update: { passwordHash: hash, role: Role.ADMIN },
        create: { email: ta.email, passwordHash: hash, role: Role.ADMIN }
      });

      await prisma.admin.upsert({
        where: { userId: user.id },
        update: { fullName: ta.fullName },
        create: { userId: user.id, fullName: ta.fullName }
      });

      await prisma.userSetting.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id }
      });
      adminsCreated++;
    }

    sendSuccess(res, {
      success: true,
      students: studentsCreated,
      admins: adminsCreated
    }, 'Test accounts created/verified');
  } catch (err: any) {
    sendError(res, `Failed to seed test accounts: ${err?.message || err}`, 500);
  }
}

