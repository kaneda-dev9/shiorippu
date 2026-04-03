import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '~~/types/database'

export function useAuth() {
  const supabase = useSupabase()
  const user = useState<User | null>('auth-user', () => null)
  const session = useState<Session | null>('auth-session', () => null)
  const profile = useState<Profile | null>('auth-profile', () => null)
  const loading = useState('auth-loading', () => true)

  // 前回のサブスクリプションを保持（重複登録防止）
  let authSubscription: { unsubscribe: () => void } | null = null

  // Initialize auth state
  async function init() {
    try {
      // 既存のサブスクリプションを解除
      authSubscription?.unsubscribe()

      const { data: { session: currentSession } } = await supabase.auth.getSession()
      session.value = currentSession
      user.value = currentSession?.user ?? null

      if (user.value) {
        await fetchProfile()
      }

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
        session.value = newSession
        user.value = newSession?.user ?? null

        if (user.value) {
          await fetchProfile()
        }
        else {
          profile.value = null
        }
      })
      authSubscription = subscription
    }
    finally {
      loading.value = false
    }
  }

  // Fetch user profile
  async function fetchProfile() {
    if (!user.value) return

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.value.id)
      .single()

    profile.value = data
  }

  // Sign in with Google OAuth
  async function signInWithGoogle(redirectTo?: string) {
    const config = useRuntimeConfig()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo || `${config.public.appUrl}/auth/callback`,
      },
    })
    if (error) throw error
  }

  // Sign out
  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    user.value = null
    session.value = null
    profile.value = null
    await navigateTo('/')
  }

  // Update profile
  async function updateProfile(updates: Partial<Profile>) {
    if (!user.value) return

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.value.id)
      .select()
      .single()

    if (error) throw error
    profile.value = data
  }

  return {
    user: readonly(user),
    session: readonly(session),
    profile: readonly(profile),
    loading: readonly(loading),
    init,
    signInWithGoogle,
    signOut,
    updateProfile,
    fetchProfile,
  }
}
