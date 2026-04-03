/**
 * GET /api/chat/:shioriId/messages
 * しおりに紐づくチャット履歴を取得する
 */
export default defineEventHandler(async (event) => {
  const shioriId = getRouterParam(event, 'shioriId')

  if (!shioriId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'しおりIDが指定されていません。',
    })
  }

  await requireShioriAccess(event, shioriId)

  const supabase = useServerSupabase()

  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, role, content, created_at')
    .eq('shiori_id', shioriId)
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) {
    console.error('チャット履歴取得エラー:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'チャット履歴の取得に失敗しました。',
    })
  }

  return data || []
})
