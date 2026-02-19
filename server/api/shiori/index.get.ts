import type { Shiori } from '~~/types/database'

/**
 * GET /api/shiori
 * ユーザーのしおり一覧を取得（RLS でフィルタ）
 */
export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const supabase = useSupabaseWithAuth(event)

  const { data, error } = await supabase
    .from('shioris')
    .select('*')
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
