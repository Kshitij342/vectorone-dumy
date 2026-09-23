import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  stats?: any[];
  errors?: string[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
  extra?: ApiResponse<T>['pagination'] | { pagination?: ApiResponse<T>['pagination']; stats?: any[] }
): void {
  const body: ApiResponse<T> = { success: true, message, data };
  if (extra) {
    if ('page' in extra) {
      body.pagination = extra as ApiResponse<T>['pagination'];
    } else {
      if (extra.pagination) body.pagination = extra.pagination;
      if (extra.stats) body.stats = extra.stats;
    }
  }
  res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  errors?: string[]
): void {
  const body: ApiResponse = { success: false, message };
  if (errors?.length) body.errors = errors;
  res.status(statusCode).json(body);
}
