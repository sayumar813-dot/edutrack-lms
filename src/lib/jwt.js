import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET_RAW = process.env.JWT_SECRET || 'edutrack_super_secret_jwt_key_2026_x9a8f7e6d5c4b3a21';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_RAW);
const COOKIE_NAME = 'edutrack_session';
const EXPIRES_IN_SECONDS = 12 * 60 * 60; // 12 hours

/**
 * Sign a JWT payload with a 12-hour expiration using jose (Edge-compatible).
 */
export async function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + EXPIRES_IN_SECONDS)
    .sign(JWT_SECRET);
}

/**
 * Verify a JWT string using jose. Returns decoded payload or null.
 */
export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch {
    return null;
  }
}

/**
 * Set the edutrack_session httpOnly cookie in response headers.
 */
export async function setAuthCookie(payload) {
  const token = await signToken(payload);
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
