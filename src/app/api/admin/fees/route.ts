import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { createAdminClient } from '@/lib/supabase/server';

// GET /api/admin/fees — list all fee invoices with student info
export async function GET(req: NextRequest) {
  const { errorResponse } = await authenticateRequest(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const supabase = createAdminClient();

    const { data: fees, error } = await supabase
      .from('fees')
      .select(`
        id,
        title,
        amount,
        paid_amount,
        due_date,
        status,
        receipt_url,
        created_at,
        academic_session_id,
        student_id,
        student_profiles!fees_student_id_fkey (
          id,
          roll_number,
          user_id,
          user_profiles (
            id,
            first_name,
            last_name,
            email
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fees fetch error:', error.message);
      return NextResponse.json({ success: true, fees: [], stats: emptyStats() });
    }

    const formattedFees = (fees || []).map((f: any) => {
      const sp = f.student_profiles;
      const up = sp?.user_profiles;
      const studentName = up
        ? `${up.first_name || ''} ${up.last_name || ''}`.trim() || up.email?.split('@')[0] || 'Student'
        : 'Unknown Student';

      return {
        _id: f.id,
        studentId: f.student_id,
        studentProfileId: sp?.id || null,
        student: studentName,
        studentEmail: up?.email || '',
        rollNo: sp?.roll_number || '—',
        invoice: f.title,
        amount: f.amount,
        paidAmount: f.paid_amount || 0,
        due: f.due_date,
        status: f.status || 'UNPAID',
        receiptUrl: f.receipt_url || null,
        createdAt: f.created_at,
      };
    });

    // Compute live stats
    const totalCollected = formattedFees.reduce((s: number, f: any) => s + Number(f.paidAmount || 0), 0);
    const totalOutstanding = formattedFees.reduce((s: number, f: any) => {
      const owed = Number(f.amount || 0) - Number(f.paidAmount || 0);
      return s + (owed > 0 ? owed : 0);
    }, 0);
    const pendingCount = formattedFees.filter((f: any) => f.status !== 'PAID').length;
    const paidCount = formattedFees.filter((f: any) => f.status === 'PAID').length;

    return NextResponse.json({
      success: true,
      fees: formattedFees,
      stats: {
        totalCollected,
        totalOutstanding,
        pendingCount,
        paidCount,
        totalInvoices: formattedFees.length,
      },
    });
  } catch (error) {
    console.error('Fees route error:', error);
    return NextResponse.json({ error: 'Server error fetching fees.' }, { status: 500 });
  }
}

// POST /api/admin/fees — create a new fee invoice
export async function POST(req: NextRequest) {
  const { errorResponse, user } = await authenticateRequest(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const { studentId, title, amount, dueDate, academicSessionId } = await req.json();

    if (!studentId || !title || !amount || !dueDate) {
      return NextResponse.json({ error: 'studentId, title, amount, and dueDate are required.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Resolve academic session if not provided
    let sessionId = academicSessionId;
    if (!sessionId) {
      sessionId = await getOrCreateActiveSessionId(supabase);
    }

    const { data: newFee, error } = await supabase
      .from('fees')
      .insert({
        student_id: studentId,
        title: title.trim(),
        amount: Number(amount),
        paid_amount: 0,
        due_date: dueDate,
        status: 'UNPAID',
        academic_session_id: sessionId,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Fee invoice created.', fee: newFee });
  } catch (error: any) {
    console.error('Create fee error:', error);
    return NextResponse.json({ error: error.message || 'Server error creating fee invoice.' }, { status: 500 });
  }
}

// PUT /api/admin/fees — mark payment / update fee
export async function PUT(req: NextRequest) {
  const { errorResponse } = await authenticateRequest(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const { id, paymentAmount, status } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Fee ID is required.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: existing, error: fetchErr } = await supabase
      .from('fees')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Fee record not found.' }, { status: 404 });
    }

    const newPaid = Number(existing.paid_amount || 0) + Number(paymentAmount || 0);
    const newStatus = status || (newPaid >= Number(existing.amount) ? 'PAID' : newPaid > 0 ? 'PARTIAL' : existing.status);

    const { data: updated, error: updateErr } = await supabase
      .from('fees')
      .update({
        paid_amount: newPaid,
        status: newStatus,
        receipt_url: newStatus === 'PAID' ? `https://receipts.edutrack.app/RECEIPT_${id.slice(0, 8).toUpperCase()}.pdf` : existing.receipt_url,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Payment recorded.', fee: updated });
  } catch (error: any) {
    console.error('Pay fee error:', error);
    return NextResponse.json({ error: error.message || 'Server error processing payment.' }, { status: 500 });
  }
}

// DELETE /api/admin/fees — delete a fee record
export async function DELETE(req: NextRequest) {
  const { errorResponse } = await authenticateRequest(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const feeId = searchParams.get('id');
    if (!feeId) return NextResponse.json({ error: 'Fee ID required.' }, { status: 400 });

    const supabase = createAdminClient();
    const { error } = await supabase.from('fees').delete().eq('id', feeId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true, message: 'Fee record deleted.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function getOrCreateActiveSessionId(supabase: any) {
  try {
    const { data: sess } = await supabase
      .from('academic_sessions')
      .select('id')
      .eq('is_current', true)
      .maybeSingle();
    if (sess?.id) return sess.id;

    const { data: anySess } = await supabase
      .from('academic_sessions')
      .select('id')
      .limit(1)
      .maybeSingle();
    if (anySess?.id) return anySess.id;

    const { data: newSess } = await supabase
      .from('academic_sessions')
      .insert({
        name: '2026 Academic Year',
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        is_current: true,
      })
      .select('id')
      .single();

    return newSess?.id || 'ad91224e-a5b8-4198-bc22-c9e55d9fccde';
  } catch (_) {
    return 'ad91224e-a5b8-4198-bc22-c9e55d9fccde';
  }
}

function emptyStats() {
  return { totalCollected: 0, totalOutstanding: 0, pendingCount: 0, paidCount: 0, totalInvoices: 0 };
}
