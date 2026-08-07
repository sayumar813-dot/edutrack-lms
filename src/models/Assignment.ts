import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISubmission {
  student: mongoose.Types.ObjectId;
  fileUrl: string;
  submittedAt: Date;
  status: 'SUBMITTED' | 'GRADED' | 'LATE';
  marksObtained?: number;
  feedback?: string;
}

export interface IAssignment extends Document {
  class: mongoose.Types.ObjectId;
  subject: mongoose.Types.ObjectId;
  teacher: mongoose.Types.ObjectId;
  title: string;
  description: string;
  dueDate: Date;
  maxMarks: number;
  attachments?: string[];
  submissions: ISubmission[];
  createdAt: Date;
  updatedAt: Date;
}

const SubmissionSchema = new Schema<ISubmission>({
  student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  fileUrl: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['SUBMITTED', 'GRADED', 'LATE'], default: 'SUBMITTED' },
  marksObtained: { type: Number },
  feedback: { type: String },
});

const AssignmentSchema = new Schema<IAssignment>(
  {
    class: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    teacher: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    dueDate: { type: Date, required: true },
    maxMarks: { type: Number, required: true, default: 100 },
    attachments: [{ type: String }],
    submissions: [SubmissionSchema],
  },
  { timestamps: true }
);

export const Assignment: Model<IAssignment> =
  mongoose.models.Assignment || mongoose.model<IAssignment>('Assignment', AssignmentSchema);
