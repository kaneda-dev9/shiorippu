import type { SupabaseClient } from '@supabase/supabase-js'

export function useSupabase() {
  const { $supabase } = useNuxtApp()
  return $supabase as SupabaseClient
}
