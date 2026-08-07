import { z } from 'zod';

export const createExamSchema = z.object({
  title: z.string().min(3, 'Exam title is required'),
  examType: z.enum(['MIDTERM', 'FINAL', 'QUIZ']),
  classId: z.string().uuid('Invalid Class ID'),
  subjectId: z.string().uuid('Invalid Subject ID'),
  maxMarks: z.number().positive('Max marks must be greater than 0'),
  academicSessionId: z.string().uuid('Invalid Academic Session ID'),
});

export const studentMarkRecordSchema = z.object({
  studentId: z.string().uuid('Invalid Student ID'),
  marksObtained: z.number().min(0, 'Marks obtained cannot be negative'),
  grade: z.string().optional(),
});

export const inputExamMarksSchema = z.object({
  examId: z.string().uuid('Invalid Exam ID'),
  subjectId: z.string().uuid('Invalid Subject ID'),
  academicSessionId: z.string().uuid('Invalid Academic Session ID'),
  records: z.array(studentMarkRecordSchema).min(1, 'At least one student mark record is required'),
});

export type CreateExamInput = z.infer<typeof createExamSchema>;
export type InputExamMarksInput = z.infer<typeof inputExamMarksSchema>;
