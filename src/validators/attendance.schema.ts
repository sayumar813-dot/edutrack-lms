import { z } from 'zod';

export const attendanceRecordSchema = z.object({
  studentId: z.string().uuid('Invalid Student ID format'),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
});

export const markAttendanceSchema = z.object({
  academicSessionId: z.string().uuid('Invalid Academic Session ID format'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'),
  records: z.array(attendanceRecordSchema).min(1, 'At least one student attendance record is required'),
});

export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
