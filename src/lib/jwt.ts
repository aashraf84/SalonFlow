import { SignJWT, jwtVerify } from 'jose'

// Lazy initialization of JWT secret - avoid throwing at build time
let _secret: Uint8Array | null = null

function getSecret(): Uint8Array {
  if (_secret) return _secret

  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build') {
      console.error('⚠️ JWT_SECRET not set in production! Using insecure default.')
    }
  }
  _secret = new TextEncoder().encode(jwtSecret || 'salonflow-dev-secret-change-me')
  return _secret
}

export async function createToken(payload: { userId: string; email: string; role: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as { userId: string; email: string; role: string; iat: number; exp: number }
  } catch {
    return null
  }
}
