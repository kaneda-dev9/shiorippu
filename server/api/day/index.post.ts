import type { Day } from '~~/types/database'

/**
 * POST /api/day
 * しおりに新しい日程を追加する
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    shiori_id: string
    day_number: number
    date?: string | null
  }>(event)

  if (!body?.shiori_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'しおりIDは必須です。',
    })
  }

  if (!body.day_number || body.day_number < 1) {
    throw createError({
      statusCode: 400,
      statusMessage: '日程番号は1以上を指定してください。',
    })
  }

  // オーナー or コラボレーターの権限チェック
  await requireShioriAccess(event, body.shiori_id)

  const supabase = useServerSupabase()

  // 現在の最大 sort_order を取得
  const { data: maxDay } = await supabase
    .from('days')
    .select('sort_order')
    .eq('shiori_id', body.shiori_id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const nextSortOrder = (maxDay?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('days')
    .insert({
      shiori_id: body.shiori_id,
      day_number: body.day_number,
      date: body.date || null,
      sort_order: nextSortOrder,
    })
    .select()
    .single()

  if (error) {
    console.error('日程作成エラー:', error)
    throw createError({
      statusCode: 500,
      statusMessage: '日程の作成に失敗しました。',
    })
  }

  setResponseStatus(event, 201)
  return data as Day
})
