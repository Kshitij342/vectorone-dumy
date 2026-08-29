import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
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
  pagination?: ApiResponse<T>['pagination']
): void {
  const body: ApiResponse<T> = { success: true, message, data };
  if (pagination) body.pagination = pagination;
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
