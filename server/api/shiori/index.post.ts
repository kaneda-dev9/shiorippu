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
  }>(event)

  if (!body?.title?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'タイトルは必須です。',
    })
  }

  if (body.title.length > 100) {
    throw createError({
      statusCode: 400,
      statusMessage: 'タイトルは100文字以内で入力してください。',
    })
  }

  if (body.start_date && body.end_date && new Date(body.start_date) > new Date(body.end_date)) {
    throw createError({
      statusCode: 400,
      statusMessage: '終了日は開始日以降の日付を指定してください。',
    })
  }

  // service role でしおりを作成（owner_id をサーバーサイドで設定）
  const supabase = useServerSupabase()

  const { data, error } = await supabase
    .from('shioris')
    .insert({
      owner_id: user.id,
      title: body.title.trim(),
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      area: body.area?.trim() || null,
    })
    .select()
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
  }

  setResponseStatus(event, 201)
  return data as Shiori
})
