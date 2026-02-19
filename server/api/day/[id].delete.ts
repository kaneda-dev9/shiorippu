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

  // day → shiori の権限チェック（owner or collaborator）
  await requireDayAccess(event, id)

  const supabase = useServerSupabase()

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
