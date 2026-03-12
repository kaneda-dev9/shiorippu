import type { Shiori } from '~~/types/database'

/**
 * PUT /api/shiori/:id
 * しおりの情報を更新する（RLS でオーナーのみ）
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'しおりIDが指定されていません。',
    })
  }

  // オーナー or コラボレーターの権限チェック
  const { role } = await requireShioriAccess(event, id)

  const body = await readBody<{
    title?: string
    start_date?: string | null
    end_date?: string | null
    area?: string | null
    is_public?: boolean
    invite_enabled?: boolean
    template_id?: string
    custom_style?: Record<string, unknown>
    cover_image_url?: string | null
  }>(event)

  if (!body || Object.keys(body).length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: '更新する項目を指定してください。',
    })
  }

  // editor はオーナー専用フィールドを変更できない
  const ownerOnlyFields = ['is_public', 'invite_enabled', 'template_id', 'custom_style', 'cover_image_url'] as const
  if (role === 'editor') {
    for (const field of ownerOnlyFields) {
      if (body[field] !== undefined) {
        throw createError({
          statusCode: 403,
          statusMessage: 'この設定はオーナーのみ変更できます。',
        })
      }
    }
  }

  if (body.title !== undefined && body.title.trim() === '') {
    throw createError({
      statusCode: 400,
      statusMessage: 'タイトルは空にできません。',
    })
  }

  if (body.title && body.title.length > 100) {
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

  // カバー画像URLのバリデーション（プリセットパス or null のみ許可）
  if (body.cover_image_url !== undefined && body.cover_image_url !== null) {
    if (!body.cover_image_url.startsWith('/covers/')) {
      throw createError({
        statusCode: 400,
        statusMessage: '無効なカバー画像URLです。',
      })
    }
  }

  // undefined のフィールドは除外
  const updateData: Record<string, unknown> = {}
  if (body.title !== undefined) updateData.title = body.title.trim()
  if (body.start_date !== undefined) updateData.start_date = body.start_date
  if (body.end_date !== undefined) updateData.end_date = body.end_date
  if (body.area !== undefined) updateData.area = body.area?.trim() || null
  if (body.is_public !== undefined) updateData.is_public = body.is_public
  if (body.invite_enabled !== undefined) updateData.invite_enabled = body.invite_enabled
  if (body.template_id !== undefined) updateData.template_id = body.template_id
  if (body.custom_style !== undefined) updateData.custom_style = body.custom_style
  if (body.cover_image_url !== undefined) updateData.cover_image_url = body.cover_image_url

  const supabase = useServerSupabase()

  const { data, error } = await supabase
    .from('shioris')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw createError({
        statusCode: 404,
        statusMessage: 'しおりが見つからないか、更新権限がありません。',
      })
    }
    console.error('しおり更新エラー:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'しおりの更新に失敗しました。',
    })
  }

  return data as Shiori
})
