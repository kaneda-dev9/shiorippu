import type { H3Event } from 'h3'
import { createClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import type { CollaboratorRole } from '~~/types/database'

export interface ShioriAccessResult {
  user: User
  role: CollaboratorRole
}

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
 * しおりへのアクセス権を検証する（owner or collaborator）
 * options.ownerOnly: true の場合、editor はエラー
 */
export async function requireShioriAccess(
  event: H3Event,
  shioriId: string,
  options?: { ownerOnly?: boolean },
): Promise<ShioriAccessResult> {
  const user = await requireAuth(event)
  const supabase = useServerSupabase()

  const { data: shiori } = await supabase
    .from('shioris')
    .select('owner_id')
    .eq('id', shioriId)
    .single()

  if (!shiori) {
    throw createError({ statusCode: 404, statusMessage: 'しおりが見つかりません。' })
  }

  // オーナーの場合
  if (shiori.owner_id === user.id) {
    return { user, role: 'owner' }
  }

  // ownerOnly の場合、ここで拒否
  if (options?.ownerOnly) {
    throw createError({ statusCode: 403, statusMessage: 'この操作はオーナーのみ実行できます。' })
  }

  // コラボレーターチェック
  const { data: collab } = await supabase
    .from('collaborators')
    .select('role')
    .eq('shiori_id', shioriId)
    .eq('user_id', user.id)
    .single()

  if (!collab) {
    throw createError({ statusCode: 403, statusMessage: 'このしおりへのアクセス権限がありません。' })
  }

  return { user, role: collab.role as CollaboratorRole }
}

/**
 * Day ID からしおりへのアクセス権を検証する
 * day → shiori の階層を自動解決
 */
export async function requireDayAccess(
  event: H3Event,
  dayId: string,
  options?: { ownerOnly?: boolean },
): Promise<ShioriAccessResult & { shioriId: string }> {
  const supabase = useServerSupabase()

  const { data: day } = await supabase
    .from('days')
    .select('shiori_id')
    .eq('id', dayId)
    .single()

  if (!day) {
    throw createError({ statusCode: 404, statusMessage: '日程が見つかりません。' })
  }

  const result = await requireShioriAccess(event, day.shiori_id, options)
  return { ...result, shioriId: day.shiori_id }
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
