import { createBrowserClient } from '@supabase/ssr'
import { getEnv } from './env'

export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = getEnv()
  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  )
}
