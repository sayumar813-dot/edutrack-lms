import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const COOKIE_NAME = 'edutrack_session';
const EXPIRES_IN_SECONDS = 12 * 60 * 60; // 12 hours

/**
 * Sign a JWT payload with a 12-hour expiration.
 */
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: EXPIRES_IN_SECONDS });
}

/**
 * Verify a JWT string. Returns decoded payload or null.
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Set the edutrack_session httpOnly cookie in response headers.
 */
export async function setAuthCookie(payload) {
  const token = signToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: EXPIRES_IN_SECONDS,
  });
  return token;
}

/**
 * Get the current session payload from httpOnly cookie.
 */
export async function getAuthCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Clear the session cookie on logout.
 */
export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
