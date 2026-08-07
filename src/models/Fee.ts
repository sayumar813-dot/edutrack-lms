export interface IFeeInvoice {
  id: string;
  studentId: string;
  title: string;
  amount: number;
  dueDate: string;
  status: 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  paidAmount?: number;
  receiptUrl?: string;
  academicSessionId: string;
  createdAt?: string;
}
