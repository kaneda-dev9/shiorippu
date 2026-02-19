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

  const supabase = useServerSupabase()

  // event → day → shiori の権限チェック（owner or collaborator）
  const { data: existingEvent } = await supabase
    .from('events')
    .select('day_id')
    .eq('id', id)
    .single()

  if (!existingEvent) {
    throw createError({ statusCode: 404, statusMessage: 'イベントが見つかりません。' })
  }

  await requireDayAccess(event, existingEvent.day_id)

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
