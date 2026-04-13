import { createClient } from '@supabase/supabase-js'

/**
 * Service Role client — bypasses RLS.
 * Use ONLY in Server Components or Route Handlers (never client-side).
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
