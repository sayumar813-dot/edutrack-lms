import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  role: z.enum(['admin', 'teacher', 'student']).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
