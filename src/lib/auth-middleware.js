import { getAuthCookie } from './jwt';

/**
 * Validates session and checks role permissions for API route requests.
 * Reads directly from the httpOnly JWT cookie — no external DB call required.
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
        { error: 'Authentication required. Please log in.' },
        { status: 401 }
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
