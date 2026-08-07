import { createClient } from '@/lib/supabase/server';
import { CreateAssignmentInput, SubmitAssignmentInput } from '@/validators/assignment.schema';
import { AuditService } from './audit.service';

export class AssignmentService {
  /**
   * Get assignments for current active session.
   * Supabase Engine RLS automatically enforces class & subject visibility rules.
   */
  static async getAssignmentsForSession() {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .order('due_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch assignments: ${error.message}`);
    }

    return data;
  }

  /**
   * Create a new assignment (Teacher/Admin only).
   */
  static async createAssignment(input: CreateAssignmentInput, actorUserId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('assignments')
      .insert({
        title: input.title,
        description: input.description,
        file_url: input.fileUrl,
        class_id: input.classId,
        subject_id: input.subjectId,
        due_date: input.dueDate,
        created_by: actorUserId,
        academic_session_id: input.academicSessionId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create assignment: ${error.message}`);
    }

    AuditService.log({
      userId: actorUserId,
      action: 'ASSIGNMENT_CREATED',
      entity: 'Assignment',
      entityId: data.id,
      payload: { title: input.title },
    });

    return data;
  }

  /**
   * Submit homework solution (Student only).
   * Engine RLS `Student assignment submissions policy` enforces submission rules.
   */
  static async submitAssignment(input: SubmitAssignmentInput, actorUserId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('assignment_submissions')
      .upsert({
        assignment_id: input.assignmentId,
        student_id: input.studentId,
        solution_url: input.solutionUrl,
        status: 'SUBMITTED',
      }, { onConflict: 'assignment_id, student_id' })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to submit assignment: ${error.message}`);
    }

    AuditService.log({
      userId: actorUserId,
      action: 'ASSIGNMENT_SUBMITTED',
      entity: 'AssignmentSubmission',
      entityId: data.id,
      payload: { assignmentId: input.assignmentId },
    });

    return data;
  }
}
