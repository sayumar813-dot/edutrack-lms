import mongoose, { Schema, Document, Model } from 'mongoose';

export type FeeStatus = 'PAID' | 'PENDING' | 'OVERDUE' | 'PARTIAL';

export interface IFee extends Document {
  student: mongoose.Types.ObjectId;
  invoiceNumber: string;
  title: string;
  amount: number;
  paidAmount: number;
  dueDate: Date;
  status: FeeStatus;
  paymentMethod?: 'CARD' | 'BANK_TRANSFER' | 'CASH';
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FeeSchema = new Schema<IFee>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    invoiceNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['PAID', 'PENDING', 'OVERDUE', 'PARTIAL'],
      default: 'PENDING',
      index: true,
    },
    paymentMethod: { type: String, enum: ['CARD', 'BANK_TRANSFER', 'CASH'] },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

export const Fee: Model<IFee> =
  mongoose.models.Fee || mongoose.model<IFee>('Fee', FeeSchema);
