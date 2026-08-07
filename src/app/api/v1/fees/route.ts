import { NextRequest, NextResponse } from 'next/server';
import { FeeService } from '@/services/fee.service';
import { createFeeInvoiceSchema } from '@/validators/fee.schema';

export async function GET() {
  try {
    const data = await FeeService.getFees();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch fee records' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createFeeInvoiceSchema.parse(body);
    const actorUserId = request.headers.get('x-user-id');

    if (!actorUserId) {
      return NextResponse.json({ success: false, error: 'User context header missing' }, { status: 401 });
    }

    const data = await FeeService.createFeeInvoice(parsed, actorUserId);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Validation error' },
      { status: 400 }
    );
  }
}
