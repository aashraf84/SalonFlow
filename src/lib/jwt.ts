import { SignJWT, jwtVerify } from 'jose'

const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production')
  }
  console.warn('⚠️ JWT_SECRET not set — using development default. Set JWT_SECRET in production!')
}
const secret = new TextEncoder().encode(jwtSecret || 'salonflow-dev-secret-change-me')

export async function createToken(payload: { userId: string; email: string; role: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as { userId: string; email: string; role: string; iat: number; exp: number }
  } catch {
    return null
  }
}
