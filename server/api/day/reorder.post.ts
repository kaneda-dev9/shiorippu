/**
 * POST /api/day/reorder
 * 日程の並び順を更新する
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody<{
    shiori_id: string
    order: { id: string; sort_order: number }[]
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
      statusMessage: 'このしおりの日程を並べ替える権限がありません。',
    })
  }

  // 各 day の sort_order を更新
  const updates = body.order.map((item) =>
    supabase
      .from('days')
      .update({ sort_order: item.sort_order })
      .eq('id', item.id)
      .eq('shiori_id', body.shiori_id),
  )

  const results = await Promise.all(updates)
  const failed = results.find((r) => r.error)

  if (failed?.error) {
    console.error('日程並び替えエラー:', failed.error)
    throw createError({
      statusCode: 500,
      statusMessage: '日程の並び替えに失敗しました。',
    })
  }

  return { success: true }
})
