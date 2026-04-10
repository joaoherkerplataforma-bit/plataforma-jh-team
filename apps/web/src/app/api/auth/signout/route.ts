import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * GET /api/auth/signout
 *
 * Signs the current user out and redirects to /login.
 * Used by the protected layout when a user has a valid Supabase Auth session
 * but no corresponding entry in the `usuarios` table — signing out first
 * prevents the middleware from redirecting them back to /dashboard.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const url = new URL('/login', request.url)
  return NextResponse.redirect(url)
}
