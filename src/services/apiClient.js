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

  let data;
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = { error: 'Invalid JSON response from server.' };
    }
  } else {
    const text = await response.text();
    data = { error: response.ok ? text : `Server returned HTML or non-JSON error (${response.status})` };
  }

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}
