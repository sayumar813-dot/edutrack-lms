export interface ISubmission {
  id: string;
  studentId: string;
  solutionUrl: string;
  submittedAt: string;
  status: 'SUBMITTED' | 'GRADED' | 'LATE';
  grade?: string;
  feedback?: string;
}

export interface IAssignment {
  id: string;
  title: string;
  description?: string;
  fileUrl?: string;
  classId: string;
  subjectId: string;
  dueDate: string;
  createdBy: string;
  academicSessionId: string;
  createdAt?: string;
}
