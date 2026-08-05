/**
 * Centralized API Fetch client for Next.js App Router.
 * Automatically attaches credentials (httpOnly cookie) and CSRF header (X-Requested-With).
 */
export async function apiClient(url, options = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest', // CSRF Defense Header
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include', // Includes httpOnly edutrack_session cookie
  };

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'An error occurred while processing request.');
  }

  return data;
}
