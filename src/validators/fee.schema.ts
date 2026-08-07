import { z } from 'zod';

export const createFeeInvoiceSchema = z.object({
  studentId: z.string().uuid('Invalid Student ID'),
  title: z.string().min(3, 'Invoice title is required'),
  amount: z.number().positive('Invoice amount must be greater than 0'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be YYYY-MM-DD format'),
  academicSessionId: z.string().uuid('Invalid Academic Session ID'),
});

export const payFeeSchema = z.object({
  feeId: z.string().uuid('Invalid Fee ID'),
  paymentAmount: z.number().positive('Payment amount must be greater than 0'),
});

export type CreateFeeInvoiceInput = z.infer<typeof createFeeInvoiceSchema>;
export type PayFeeInput = z.infer<typeof payFeeSchema>;
