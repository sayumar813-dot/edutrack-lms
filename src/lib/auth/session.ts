import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-super-secret-key-change-in-prod'
);

export interface SessionPayload {
  userId: string;
  email: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT' | 'admin' | 'teacher' | 'student' | 'parent';
  [key: string]: unknown;
}

export async function encryptSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(JWT_SECRET);
}

export async function decryptSession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
