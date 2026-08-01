import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-min-32-chars-long'
)

export interface AdminSession {
  id: string
  email: string
  full_name: string
  role: 'super_admin' | 'admin'
}

export async function createSession(admin: AdminSession): Promise<string> {
  const token = await new SignJWT({ ...admin })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)

  return token
}

export async function verifySession(token: string): Promise<AdminSession | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET)
    return verified.payload as unknown as AdminSession
  } catch {
    return null
  }
}

export async function getSession(): Promise<AdminSession | null> {
  const cookieStore = cookies()
  const token = cookieStore.get('admin_session')?.value

  if (!token) return null

  return verifySession(token)
}

export async function logout(): Promise<void> {
  const cookieStore = cookies()
  cookieStore.delete('admin_session')
}
