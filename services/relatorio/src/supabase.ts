import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { Config } from './config'

/**
 * Cliente Supabase com service_role.
 * Bypassa RLS — uso exclusivo em backend (este serviço roda no Railway).
 * A service_role key NUNCA pode ser exposta no browser.
 */
export function criarClienteSupabase(config: Config): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
