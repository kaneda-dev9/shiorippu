import type { Day } from '~~/types/database'

/**
 * PUT /api/day/:id
 * 日程の情報を更新する
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: '日程IDが指定されていません。',
    })
  }

  const body = await readBody<{
    day_number?: number
    date?: string | null
  }>(event)

  if (!body || Object.keys(body).length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: '更新する項目を指定してください。',
    })
  }

  // day → shiori の権限チェック（owner or collaborator）
  await requireDayAccess(event, id)

  const supabase = useServerSupabase()

  const updateData: Record<string, unknown> = {}
  if (body.day_number !== undefined) updateData.day_number = body.day_number
  if (body.date !== undefined) updateData.date = body.date

  const { data, error } = await supabase
    .from('days')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('日程更新エラー:', error)
    throw createError({
      statusCode: 500,
      statusMessage: '日程の更新に失敗しました。',
    })
  }

  return data as Day
})
