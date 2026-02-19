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

  const user = await requireAuth(event)
  const supabase = useServerSupabase()

  // アクセス権チェック（オーナーまたはコラボレーター）
  const { data: shiori } = await supabase
    .from('shioris')
    .select('owner_id')
    .eq('id', shioriId)
    .single()

  if (!shiori) {
    throw createError({ statusCode: 404, statusMessage: 'しおりが見つかりません。' })
  }

  if (shiori.owner_id !== user.id) {
    const { data: collab } = await supabase
      .from('collaborators')
      .select('id')
      .eq('shiori_id', shioriId)
      .eq('user_id', user.id)
      .single()

    if (!collab) {
      throw createError({ statusCode: 403, statusMessage: 'アクセス権限がありません。' })
    }
  }

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
