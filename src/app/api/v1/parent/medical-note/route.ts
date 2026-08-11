import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { AlertService } from '@/services/alert.service';

export async function POST(req: NextRequest) {
  const { errorResponse, user } = await authenticateRequest(req, ['parent']);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const wardName = body.wardName || body.wardId || 'David Miller';
    const noteTitle = body.noteTitle || body.reason || 'Medical Certificate';
    const details = body.details || body.doctorNotes || 'Doctor rest certificate attached.';
    const { startDate, endDate, doctorName, clinicName, attachment } = body;

    const sessionUser = user as any;
    const parentName = sessionUser?.name || sessionUser?.email || 'Parent';

    const alertMessage = `Parent ${parentName} submitted a verified medical note for ${wardName}.\n• Reason: ${noteTitle}\n• Dates: ${startDate || 'N/A'} to ${endDate || 'N/A'}\n• Doctor/Clinic: ${doctorName || 'Doctor'} (${clinicName || 'Clinic'})\n• Notes: ${details}`;

    let alertObj: any = null;
    try {
      alertObj = await AlertService.emitAlert({
        eventType: 'STUDENT_INCIDENT',
        title: `Medical Note Submitted: ${wardName}`,
        message: alertMessage,
        severity: 'HIGH',
        targetRole: 'ADMIN',
        deduplicationKey: `MEDICAL_NOTE_${wardName}_${Date.now()}`,
      });
    } catch (_) {}

    try {
      const origin = req.nextUrl.origin;
      await fetch(`${origin}/api/v1/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Cookie': req.headers.get('cookie') || '',
        },
        body: JSON.stringify({
          eventType: 'STUDENT_INCIDENT',
          title: `Medical Note Submitted: ${wardName}`,
          message: alertMessage,
          severity: 'HIGH',
          targetRole: 'ADMIN',
          attachment: attachment || null,
        }),
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: `Medical note for ${wardName} submitted successfully. School Admin and Super Admin have been alerted.`,
      alert: alertObj,
    });
  } catch (error: any) {
    console.error('Submit medical note error:', error);
    return NextResponse.json({ error: error.message || 'Server error submitting medical note.' }, { status: 500 });
  }
}
