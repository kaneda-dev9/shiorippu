import type { Shiori } from '~~/types/database'

/**
 * GET /api/shiori
 * ユーザーのしおり一覧を取得（自分がオーナー + コラボレーター）
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const supabase = useServerSupabase()

  // 自分がオーナーのしおり
  const { data: ownShioris, error: ownError } = await supabase
    .from('shioris')
    .select('*')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })

  if (ownError) {
    console.error('しおり一覧取得エラー:', ownError)
    throw createError({
      statusCode: 500,
      statusMessage: 'しおり一覧の取得に失敗しました。',
    })
  }

  // 自分がコラボレーターのしおり
  const { data: collabs } = await supabase
    .from('collaborators')
    .select('shiori_id')
    .eq('user_id', user.id)

  let collabShioris: Shiori[] = []
  if (collabs && collabs.length > 0) {
    const shioriIds = collabs.map((c) => c.shiori_id)
    const { data } = await supabase
      .from('shioris')
      .select('*')
      .in('id', shioriIds)
      .order('updated_at', { ascending: false })

    collabShioris = (data || []) as Shiori[]
  }

  // 統合して重複排除、updated_at で降順ソート
  const ownIds = new Set((ownShioris || []).map((s) => s.id))
  const unique = collabShioris.filter((s) => !ownIds.has(s.id))
  const all = [...(ownShioris || []), ...unique] as Shiori[]
  all.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

  return all
})
