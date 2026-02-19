/**
 * POST /api/event/reorder
 * イベントの並び順を更新する（同じ day 内、または day 間の移動）
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

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

  const supabase = useServerSupabase()

  // オーナー権限チェック
  const { data: shiori } = await supabase
    .from('shioris')
    .select('owner_id')
    .eq('id', body.shiori_id)
    .single()

  if (!shiori || shiori.owner_id !== user.id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'このしおりのイベントを並べ替える権限がありません。',
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
