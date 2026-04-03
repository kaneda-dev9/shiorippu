/**
 * POST /api/event/reorder
 * イベントの並び順を更新する（同じ day 内、または day 間の移動）
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    shiori_id: string
    order: { id: string; day_id: string; sort_order: number }[]
  }>(event)

  if (!body?.shiori_id || !body?.order?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'しおりIDと並び順データは必須です。',
    })
  }

  // オーナー or コラボレーターの権限チェック
  await requireShioriAccess(event, body.shiori_id)

  const supabase = useServerSupabase()

  // しおりに属する day_id のリストを取得し、リクエスト内の day_id が正当か検証
  const { data: validDays, error: dayError } = await supabase
    .from('days')
    .select('id')
    .eq('shiori_id', body.shiori_id)

  if (dayError || !validDays) {
    throw createError({
      statusCode: 500,
      statusMessage: '日程の検証に失敗しました。',
    })
  }

  const validDayIds = new Set(validDays.map((d) => d.id))
  const invalidDayId = body.order.find((item) => !validDayIds.has(item.day_id))
  if (invalidDayId) {
    throw createError({
      statusCode: 403,
      statusMessage: '指定されたイベントはこのしおりに属していません。',
    })
  }

  // 各 event の sort_order と day_id を更新
  const updates = body.order.map((item) =>
    supabase
      .from('events')
      .update({ sort_order: item.sort_order, day_id: item.day_id })
      .eq('id', item.id),
  )

  const results = await Promise.all(updates)
  const failed = results.find((r) => r.error)

  if (failed?.error) {
    console.error('イベント並び替えエラー:', failed.error)
    throw createError({
      statusCode: 500,
      statusMessage: 'イベントの並び替えに失敗しました。',
    })
  }

  return { success: true }
})
