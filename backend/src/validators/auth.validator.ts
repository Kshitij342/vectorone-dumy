import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  studentId: z.string().min(3, 'Student ID is required'),
  year: z.union([z.string(), z.number()]).transform((val) => Number(val)),
  department: z.string().min(1, 'Department is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['STUDENT', 'ADMIN', 'FACULTY']).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  role: z.enum(['student', 'admin', 'faculty']).optional(),
});
