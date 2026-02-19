/**
 * DELETE /api/event/:id
 * イベントを削除する
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'イベントIDが指定されていません。',
    })
  }

  const user = await requireAuth(event)
  const supabase = useServerSupabase()

  // event → day → shiori のオーナー権限チェック
  const { data: existingEvent } = await supabase
    .from('events')
    .select('day_id')
    .eq('id', id)
    .single()

  if (!existingEvent) {
    throw createError({ statusCode: 404, statusMessage: 'イベントが見つかりません。' })
  }

  const { data: day } = await supabase
    .from('days')
    .select('shiori_id')
    .eq('id', existingEvent.day_id)
    .single()

  if (!day) {
    throw createError({ statusCode: 404, statusMessage: '日程が見つかりません。' })
  }

  const { data: shiori } = await supabase
    .from('shioris')
    .select('owner_id')
    .eq('id', day.shiori_id)
    .single()

  if (!shiori || shiori.owner_id !== user.id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'このイベントを削除する権限がありません。',
    })
  }

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('イベント削除エラー:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'イベントの削除に失敗しました。',
    })
  }

  setResponseStatus(event, 204)
  return null
})
