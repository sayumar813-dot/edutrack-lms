import { z } from 'zod';

export const createAssignmentSchema = z.object({
  title: z.string().min(3, 'Assignment title must be at least 3 characters long'),
  description: z.string().optional(),
  fileUrl: z.string().url('Invalid URL format').optional().or(z.literal('')),
  classId: z.string().uuid('Invalid Class ID'),
  subjectId: z.string().uuid('Invalid Subject ID'),
  dueDate: z.string().datetime('Due date must be a valid ISO date-time string'),
  academicSessionId: z.string().uuid('Invalid Academic Session ID'),
});

export const submitAssignmentSchema = z.object({
  assignmentId: z.string().uuid('Invalid Assignment ID'),
  studentId: z.string().uuid('Invalid Student ID'),
  solutionUrl: z.string().url('Solution file URL must be a valid link'),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type SubmitAssignmentInput = z.infer<typeof submitAssignmentSchema>;
