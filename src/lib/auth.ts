import bcrypt from 'bcryptjs'
import { createServerClient } from './supabase'
import { AdminSession } from './session'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function login(email: string, password: string): Promise<AdminSession | null> {
  const supabase = createServerClient()

  const { data: admin, error } = await supabase
    .from('admins')
    .select('*')
    .eq('email', email)
    .eq('is_active', true)
    .single()

  if (error || !admin) return null

  const isValid = await verifyPassword(password, admin.password_hash)
  if (!isValid) return null

  // Update last login
  await supabase
    .from('admins')
    .update({ last_login: new Date().toISOString() })
    .eq('id', admin.id)

  return {
    id: admin.id,
    email: admin.email,
    full_name: admin.full_name,
    role: admin.role,
  }
}

