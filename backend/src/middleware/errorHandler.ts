import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isOperational = (err as AppError).isOperational;
  const statusCode = (err as AppError).statusCode || 500;

  // Log the error (never log passwords/secrets — just message + stack)
  if (statusCode >= 500) {
    logger.error(err.message, { stack: err.stack });
  } else {
    logger.warn(err.message);
  }

  // Don't expose stack traces in production
  res.status(statusCode).json({
    success: false,
    message: isOperational ? err.message : 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && !isOperational
      ? { stack: err.stack }
      : {}),
  });
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ success: false, message: 'Route not found' });
}
