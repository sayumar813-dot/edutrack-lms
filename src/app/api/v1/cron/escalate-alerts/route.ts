import { NextRequest, NextResponse } from 'next/server';
import { AlertService } from '@/services/alert.service';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const secret = process.env.CRON_SECRET_KEY || 'edutrack-cron-secret';

    if (authHeader !== `Bearer ${secret}` && request.nextUrl.searchParams.get('key') !== secret) {
      return NextResponse.json({ success: false, error: 'Unauthorized cron runner' }, { status: 401 });
    }

    const result = await AlertService.runEscalationCheck();

    return NextResponse.json({
      success: true,
      message: `Escalation check completed. ${result.escalatedCount} alert(s) escalated.`,
      escalatedCount: result.escalatedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error executing escalation cron' },
      { status: 500 }
    );
  }
}
