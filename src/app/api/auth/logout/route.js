import { clearAuthCookie } from '@/lib/jwt';

export async function POST() {
  await clearAuthCookie();
  return Response.json({ success: true, message: 'Logged out successfully.' });
}
