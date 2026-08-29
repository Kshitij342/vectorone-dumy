import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../config/jwt';
import { sendError } from '../utils/apiResponse';

// Extend Express Request to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Verifies JWT from Authorization header or cookie.
 * Attaches decoded payload to req.user.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token =
    (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null) ||
    req.cookies?.token;

  if (!token) {
    sendError(res, 'Authentication required', 401);
    return;
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    sendError(res, 'Invalid or expired token', 401);
  }
}

/**
 * Requires the authenticated user to have the ADMIN role.
 * Must be used AFTER authenticate.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    sendError(res, 'Authentication required', 401);
    return;
  }
  if (req.user.role !== 'ADMIN') {
    sendError(res, 'Admin access required', 403);
    return;
  }
  next();
}

/**
 * Requires the authenticated user to have the STUDENT role.
 * Must be used AFTER authenticate.
 */
export function requireStudent(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    sendError(res, 'Authentication required', 401);
    return;
  }
  if (req.user.role !== 'STUDENT') {
    sendError(res, 'Student access required', 403);
    return;
  }
  next();
}

/**
 * Allows STUDENT or ADMIN — blocks unauthenticated.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  authenticate(req, res, () => {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }
    next();
  });
}
