import { getAuthCookie } from './jwt';

/**
 * Validates session and checks role permissions for API route requests.
 * Reads directly from the httpOnly JWT cookie — no external DB call required.
 * SUPER_ADMIN automatically satisfies 'admin' role requirements.
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

  if (allowedRoles.length > 0) {
    const userRole = (session.role || '').toLowerCase();
    const userRoles = (session.roles || [userRole]).map((r) => r.toLowerCase());
    const isSuperAdmin = userRoles.includes('super_admin') || userRole === 'super_admin';
    const isAdmin = userRoles.includes('admin') || userRole === 'admin' || isSuperAdmin;

    const hasAccess = allowedRoles.some((r) => {
      const target = r.toLowerCase();
      if (target === 'admin') return isAdmin;
      if (target === 'super_admin') return isSuperAdmin;
      return userRoles.includes(target) || userRole === target;
    });

    if (!hasAccess) {
      return {
        user: null,
        errorResponse: Response.json(
          { error: 'Forbidden. You do not have permission to access this resource.' },
          { status: 403 }
        ),
      };
    }
  }

  return { user: session, errorResponse: null };
}
