import { NextRequest, NextResponse } from 'next/server';
import { ParentService } from '@/services/parent.service';

export async function GET(request: NextRequest) {
  try {
    const parentUserId = request.headers.get('x-user-id');
    if (!parentUserId) {
      return NextResponse.json({ success: false, error: 'User context header missing' }, { status: 401 });
    }

    const wards = await ParentService.getLinkedWards(parentUserId);
    return NextResponse.json({ success: true, data: wards });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch ward profiles' },
      { status: 500 }
    );
  }
}
