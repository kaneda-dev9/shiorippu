/**
 * DELETE /api/shiori/:id/collaborators/:collaboratorId
 * コラボレーターをキック（オーナーのみ）
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const collaboratorId = getRouterParam(event, 'collaboratorId')

  if (!id || !collaboratorId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'しおりIDとコラボレーターIDは必須です。',
    })
  }

  // オーナーのみ
  await requireShioriAccess(event, id, { ownerOnly: true })

  const supabase = useServerSupabase()

  const { error } = await supabase
    .from('collaborators')
    .delete()
    .eq('id', collaboratorId)
    .eq('shiori_id', id)

  if (error) {
    console.error('コラボレーター削除エラー:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'コラボレーターの削除に失敗しました。',
    })
  }

  setResponseStatus(event, 204)
  return null
})
