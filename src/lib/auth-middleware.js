import { getAuthCookie } from './jwt';
import connectToDatabase from './db';
import User from '@/models/User';

/**
 * Validates session and checks role permissions for API route requests.
 * Enforces IMMEDIATE ACCESS REVOCATION by checking if the User record still exists in DB.
 * Returns { user, errorResponse }
 */
export async function authenticateRequest(req, allowedRoles = []) {
  // CSRF protection for state-changing requests
  const method = req.method.toUpperCase();
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const requestedWith = req.headers.get('x-requested-with');
    if (requestedWith !== 'XMLHttpRequest') {
      return {
        user: null,
        errorResponse: Response.json(
          { error: 'CSRF Header missing or invalid.' },
          { status: 403 }
        ),
      };
    }
  }

  const session = await getAuthCookie();
  if (!session) {
    return {
      user: null,
      errorResponse: Response.json(
        { error: 'Authentication required. Session expired or invalid.' },
        { status: 401 }
      ),
    };
  }

  // Verify User record still exists in MongoDB (Immediate Revocation on Account Deletion)
  try {
    await connectToDatabase();
    const dbUser = await User.findById(session.userId);
    if (!dbUser) {
      return {
        user: null,
        errorResponse: Response.json(
          { error: 'Account has been deleted or deactivated. Immediate access revoked.' },
          { status: 401 }
        ),
      };
    }
  } catch (err) {
    return {
      user: null,
      errorResponse: Response.json(
        { error: 'Server authentication verification error.' },
        { status: 500 }
      ),
    };
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
    return {
      user: null,
      errorResponse: Response.json(
        { error: 'Forbidden. You do not have permission to access this resource.' },
        { status: 403 }
      ),
    };
  }

  return { user: session, errorResponse: null };
}
