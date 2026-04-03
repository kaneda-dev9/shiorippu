import type { Shiori } from '~~/types/database'

/**
 * POST /api/shiori
 * 新しいしおりを作成する
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody<{
    title?: string
    start_date?: string | null
    end_date?: string | null
    area?: string | null
  }>(event).catch(() => null)

  const title = body?.title?.trim() || '新しいしおり'

  if (title.length > 100) {
    throw createError({
      statusCode: 400,
      statusMessage: 'タイトルは100文字以内で入力してください。',
    })
  }

  if (body?.start_date && body?.end_date && new Date(body.start_date) > new Date(body.end_date)) {
    throw createError({
      statusCode: 400,
      statusMessage: '終了日は開始日以降の日付を指定してください。',
    })
  }

  // service role でしおりを作成（RLSバイパス、owner_id をサーバーサイドで設定）
  const supabase = useServerSupabase()

  // しおりを作成
  const { data, error } = await supabase
    .from('shioris')
    .insert({
      owner_id: user.id,
      title,
      start_date: body?.start_date || null,
      end_date: body?.end_date || null,
      area: body?.area?.trim() || null,
      template_id: 'simple',
    })
    .select('id, title, owner_id, created_at, updated_at')
    .single()

  if (error) {
    console.error('しおり作成エラー:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'しおりの作成に失敗しました。',
    })
  }

  // オーナーを collaborators テーブルにも追加
  const { error: collabError } = await supabase
    .from('collaborators')
    .insert({
      shiori_id: data.id,
      user_id: user.id,
      role: 'owner',
    })

  if (collabError) {
    console.error('コラボレーター追加エラー:', collabError)
    // しおりをロールバック削除
    await supabase.from('shioris').delete().eq('id', data.id)
    throw createError({
      statusCode: 500,
      statusMessage: 'しおりの作成に失敗しました。',
    })
  }

  setResponseStatus(event, 201)
  return data as Shiori
})
