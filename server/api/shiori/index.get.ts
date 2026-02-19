import type { Shiori } from '~~/types/database'

/**
 * GET /api/shiori
 * ユーザーのしおり一覧を取得（RLS でフィルタ）
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const supabase = useServerSupabase()

  // service role でオーナーのしおりのみ取得
  const { data, error } = await supabase
    .from('shioris')
    .select('*')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('しおり一覧取得エラー:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'しおり一覧の取得に失敗しました。',
    })
  }

  return data as Shiori[]
})
