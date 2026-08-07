export interface IExam {
  id: string;
  title: string;
  examType: string;
  classId: string;
  subjectId: string;
  maxMarks: number;
  academicSessionId: string;
  createdAt?: string;
}

export interface IExamMark {
  id: string;
  examId: string;
  studentId: string;
  subjectId: string;
  marksObtained: number;
  grade?: string;
  teacherId: string;
  academicSessionId: string;
  createdAt?: string;
}
