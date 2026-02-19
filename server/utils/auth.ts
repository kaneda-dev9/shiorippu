import type { H3Event } from 'h3'
import { createClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

/**
 * リクエストの Authorization ヘッダーから Supabase ユーザーを取得する
 * JWT を検証し、認証済みユーザー情報を返す
 */
export async function requireAuth(event: H3Event): Promise<User> {
  const authorization = getHeader(event, 'authorization')

  if (!authorization) {
    throw createError({
      statusCode: 401,
      statusMessage: '認証が必要です。ログインしてください。',
    })
  }

  const token = authorization.replace('Bearer ', '')

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: '認証トークンが無効です。',
    })
  }

  const config = useRuntimeConfig()
  const supabase = createClient(
    config.public.supabaseUrl,
    config.public.supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    },
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    throw createError({
      statusCode: 401,
      statusMessage: '認証トークンが無効または期限切れです。再ログインしてください。',
    })
  }

  return user
}

/**
 * ユーザーのアクセストークンで Supabase クライアントを作成する（RLS適用）
 */
export function useSupabaseWithAuth(event: H3Event) {
  const authorization = getHeader(event, 'authorization')
  const token = authorization?.replace('Bearer ', '') || ''
  const config = useRuntimeConfig()

  return createClient(
    config.public.supabaseUrl,
    config.public.supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    },
  )
}
