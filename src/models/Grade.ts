import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGrade extends Document {
  student: mongoose.Types.ObjectId;
  subject: mongoose.Types.ObjectId;
  class: mongoose.Types.ObjectId;
  term: string;
  examName: string;
  marksObtained: number;
  maxMarks: number;
  gradePoint?: string;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GradeSchema = new Schema<IGrade>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    class: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    term: { type: String, required: true },
    examName: { type: String, required: true },
    marksObtained: { type: Number, required: true, min: 0 },
    maxMarks: { type: Number, required: true, default: 100 },
    gradePoint: { type: String },
    remarks: { type: String },
  },
  { timestamps: true }
);

export const Grade: Model<IGrade> =
  mongoose.models.Grade || mongoose.model<IGrade>('Grade', GradeSchema);
