import { createClient } from '@/lib/supabase/server';
import { CreateExamInput, InputExamMarksInput } from '@/validators/exam.schema';
import { AuditService } from './audit.service';

export class ExamService {
  /**
   * Fetch exam schedule and gradebook metrics.
   */
  static async getExamsForSession() {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch exams: ${error.message}`);
    }

    return data;
  }

  /**
   * Create an exam schedule entry.
   */
  static async createExam(input: CreateExamInput, actorUserId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('exams')
      .insert({
        title: input.title,
        exam_type: input.examType,
        class_id: input.classId,
        subject_id: input.subjectId,
        max_marks: input.maxMarks,
        academic_session_id: input.academicSessionId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create exam: ${error.message}`);
    }

    AuditService.log({
      userId: actorUserId,
      action: 'EXAM_CREATED',
      entity: 'Exam',
      entityId: data.id,
      payload: { title: input.title, examType: input.examType },
    });

    return data;
  }

  /**
   * Input or update exam marks for students.
   * PostgreSQL RLS policy `Teacher exam marks restricted to assignments` natively checks
   * if the logged in teacher is assigned to the subject in `teacher_assignments`.
   */
  static async inputExamMarks(input: InputExamMarksInput, actorUserId: string) {
    const supabase = await createClient();

    const markPayloads = input.records.map((r) => ({
      exam_id: input.examId,
      student_id: r.studentId,
      subject_id: input.subjectId,
      marks_obtained: r.marksObtained,
      grade: r.grade || null,
      teacher_id: actorUserId,
      academic_session_id: input.academicSessionId,
    }));

    const { data, error } = await supabase
      .from('exam_marks')
      .upsert(markPayloads, { onConflict: 'exam_id, student_id' })
      .select();

    if (error) {
      throw new Error(`Failed to input exam marks: ${error.message}`);
    }

    AuditService.log({
      userId: actorUserId,
      action: 'EXAM_MARKS_SUBMITTED',
      entity: 'ExamMark',
      payload: { examId: input.examId, count: input.records.length },
    });

    return data;
  }
}
