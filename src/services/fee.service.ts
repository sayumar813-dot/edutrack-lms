import { createClient } from '@/lib/supabase/server';
import { CreateFeeInvoiceInput, PayFeeInput } from '@/validators/fee.schema';
import { AuditService } from './audit.service';

export class FeeService {
  /**
   * Fetch fee invoices.
   * PostgreSQL RLS policy `Parent ward fee access` automatically limits rows to parent's linked wards or admin scope.
   */
  static async getFees() {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('fees')
      .select(`
        *,
        student_profiles (
          id,
          roll_number,
          user_profiles (
            first_name,
            last_name,
            email
          )
        )
      `)
      .order('due_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch fee invoices: ${error.message}`);
    }

    return data;
  }

  /**
   * Issue a fee invoice (Admin only).
   */
  static async createFeeInvoice(input: CreateFeeInvoiceInput, actorUserId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('fees')
      .insert({
        student_id: input.studentId,
        title: input.title,
        amount: input.amount,
        due_date: input.dueDate,
        academic_session_id: input.academicSessionId,
        status: 'UNPAID',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create fee invoice: ${error.message}`);
    }

    AuditService.log({
      userId: actorUserId,
      action: 'FEE_INVOICE_CREATED',
      entity: 'Fee',
      entityId: data.id,
      payload: { amount: input.amount, title: input.title },
    });

    return data;
  }

  /**
   * Process fee payment clearance.
   */
  static async payFee(input: PayFeeInput, actorUserId: string) {
    const supabase = await createClient();

    // Fetch existing fee record
    const { data: feeRecord, error: fetchErr } = await supabase
      .from('fees')
      .select('*')
      .eq('id', input.feeId)
      .single();

    if (fetchErr || !feeRecord) {
      throw new Error('Fee invoice record not found');
    }

    const newPaidAmount = Number(feeRecord.paid_amount || 0) + input.paymentAmount;
    const newStatus = newPaidAmount >= Number(feeRecord.amount) ? 'PAID' : 'PARTIAL';
    const simulatedReceiptUrl = `https://storage.edutrack.internal/receipts/RECEIPT_${input.feeId}.pdf`;

    const { data, error } = await supabase
      .from('fees')
      .update({
        paid_amount: newPaidAmount,
        status: newStatus,
        receipt_url: simulatedReceiptUrl,
      })
      .eq('id', input.feeId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to process fee payment: ${error.message}`);
    }

    AuditService.log({
      userId: actorUserId,
      action: 'FEE_PAYMENT_PROCESSED',
      entity: 'Fee',
      entityId: input.feeId,
      payload: { paymentAmount: input.paymentAmount, status: newStatus },
    });

    return data;
  }
}
