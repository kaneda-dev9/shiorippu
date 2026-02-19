import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client with service role key
export function useServerSupabase() {
  const config = useRuntimeConfig()
  return createClient(
    config.public.supabaseUrl,
    config.supabaseServiceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
