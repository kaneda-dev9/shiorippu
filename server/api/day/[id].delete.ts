/**
 * DELETE /api/day/:id
 * 日程を削除する（CASCADE で events も削除される）
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: '日程IDが指定されていません。',
    })
  }

  const user = await requireAuth(event)
  const supabase = useServerSupabase()

  // day → shiori のオーナー権限チェック
  const { data: day } = await supabase
    .from('days')
    .select('shiori_id')
    .eq('id', id)
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
      statusMessage: 'この日程を削除する権限がありません。',
    })
  }

  const { error } = await supabase
    .from('days')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('日程削除エラー:', error)
    throw createError({
      statusCode: 500,
      statusMessage: '日程の削除に失敗しました。',
    })
  }

  setResponseStatus(event, 204)
  return null
})
