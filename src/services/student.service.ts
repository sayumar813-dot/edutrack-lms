import { createClient } from '@/lib/supabase/server';
import { AuditService } from './audit.service';

export interface CreateStudentInput {
  userId: string;
  rollNumber: string;
  academicSessionId: string;
}

export class StudentService {
  /**
   * Get student profiles for active session.
   * Engine-level RLS policies automatically scope and filter the output.
   */
  static async getStudentsForSession() {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('student_profiles')
      .select(`
        id,
        roll_number,
        academic_session_id,
        created_at,
        user_profiles (
          id,
          first_name,
          last_name,
          email
        )
      `);

    if (error) {
      throw new Error(`Failed to fetch student profiles: ${error.message}`);
    }

    return data;
  }

  /**
   * Create a new student profile.
   */
  static async createStudentProfile(input: CreateStudentInput, actorUserId?: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('student_profiles')
      .insert({
        user_id: input.userId,
        roll_number: input.rollNumber,
        academic_session_id: input.academicSessionId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create student profile: ${error.message}`);
    }

    AuditService.log({
      userId: actorUserId,
      action: 'STUDENT_PROFILE_CREATED',
      entity: 'StudentProfile',
      entityId: data.id,
      payload: { rollNumber: input.rollNumber },
    });

    return data;
  }
}
