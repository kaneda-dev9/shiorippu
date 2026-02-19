import type { Shiori } from '~~/types/database'

/**
 * PUT /api/shiori/:id/invite
 * 招待リンクの有効化/無効化（オーナーのみ）
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'しおりIDが指定されていません。',
    })
  }

  // オーナーのみ
  await requireShioriAccess(event, id, { ownerOnly: true })

  const body = await readBody<{ invite_enabled: boolean }>(event)

  if (body?.invite_enabled === undefined) {
    throw createError({
      statusCode: 400,
      statusMessage: 'invite_enabled は必須です。',
    })
  }

  const supabase = useServerSupabase()

  // 現在のしおり情報を取得
  const { data: shiori } = await supabase
    .from('shioris')
    .select('invite_token')
    .eq('id', id)
    .single()

  const updateData: Record<string, unknown> = {
    invite_enabled: body.invite_enabled,
  }

  // 有効化時にトークンが未生成なら新規作成
  if (body.invite_enabled && !shiori?.invite_token) {
    updateData.invite_token = crypto.randomUUID()
  }

  const { data, error } = await supabase
    .from('shioris')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('招待設定更新エラー:', error)
    throw createError({
      statusCode: 500,
      statusMessage: '招待設定の更新に失敗しました。',
    })
  }

  return data as Shiori
})
