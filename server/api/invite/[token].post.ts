/**
 * POST /api/invite/:token
 * 招待リンクを受け入れてコラボレーターとして参加
 */
export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')

  if (!token) {
    throw createError({
      statusCode: 400,
      statusMessage: '招待トークンが指定されていません。',
    })
  }

  const user = await requireAuth(event)
  const supabase = useServerSupabase()

  // トークンでしおりを特定
  const { data: shiori } = await supabase
    .from('shioris')
    .select('id, owner_id, invite_enabled')
    .eq('invite_token', token)
    .single()

  if (!shiori) {
    throw createError({
      statusCode: 404,
      statusMessage: '招待リンクが無効です。',
    })
  }

  if (!shiori.invite_enabled) {
    throw createError({
      statusCode: 403,
      statusMessage: 'この招待リンクは現在無効になっています。',
    })
  }

  // オーナー自身の場合
  if (shiori.owner_id === user.id) {
    return { shiori_id: shiori.id, already_member: true }
  }

  // 既存コラボレーターチェック
  const { data: existing } = await supabase
    .from('collaborators')
    .select('id')
    .eq('shiori_id', shiori.id)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    return { shiori_id: shiori.id, already_member: true }
  }

  // 新規コラボレーターとして追加
  const { error } = await supabase
    .from('collaborators')
    .insert({
      shiori_id: shiori.id,
      user_id: user.id,
      role: 'editor',
    })

  if (error) {
    console.error('コラボレーター追加エラー:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'コラボレーターの追加に失敗しました。',
    })
  }

  setResponseStatus(event, 201)
  return { shiori_id: shiori.id, already_member: false }
})
