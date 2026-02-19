/**
 * DELETE /api/shiori/:id
 * しおりを削除する（RLS でオーナーのみ）
 * CASCADE で days, events, chat_messages, collaborators も削除される
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'しおりIDが指定されていません。',
    })
  }

  await requireAuth(event)
  const supabase = useSupabaseWithAuth(event)

  const { error } = await supabase
    .from('shioris')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('しおり削除エラー:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'しおりの削除に失敗しました。',
    })
  }

  setResponseStatus(event, 204)
  return null
})
