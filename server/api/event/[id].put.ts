import type { Event, EventCategory } from '~~/types/database'

/**
 * PUT /api/event/:id
 * イベントの情報を更新する
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'イベントIDが指定されていません。',
    })
  }

  const body = await readBody<{
    title?: string
    category?: EventCategory
    icon?: string
    start_time?: string | null
    end_time?: string | null
    memo?: string | null
    url?: string | null
    place_id?: string | null
    lat?: number | null
    lng?: number | null
    address?: string | null
    booking_status?: string
  }>(event)

  if (!body || Object.keys(body).length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: '更新する項目を指定してください。',
    })
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

  const supabase = useServerSupabase()

  // event → day → shiori の権限チェック（owner or collaborator）
  const { data: existingEvent } = await supabase
    .from('events')
    .select('day_id')
    .eq('id', id)
    .single()

  if (!existingEvent) {
    throw createError({ statusCode: 404, statusMessage: 'イベントが見つかりません。' })
  }

  await requireDayAccess(event, existingEvent.day_id)

  const updateData: Record<string, unknown> = {}
  if (body.title !== undefined) updateData.title = body.title.trim()
  if (body.category !== undefined) updateData.category = body.category
  if (body.icon !== undefined) updateData.icon = body.icon
  if (body.start_time !== undefined) updateData.start_time = body.start_time
  if (body.end_time !== undefined) updateData.end_time = body.end_time
  if (body.memo !== undefined) updateData.memo = body.memo
  if (body.url !== undefined) updateData.url = body.url
  if (body.place_id !== undefined) updateData.place_id = body.place_id
  if (body.lat !== undefined) updateData.lat = body.lat
  if (body.lng !== undefined) updateData.lng = body.lng
  if (body.address !== undefined) updateData.address = body.address
  if (body.booking_status !== undefined) updateData.booking_status = body.booking_status

  const { data, error } = await supabase
    .from('events')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('イベント更新エラー:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'イベントの更新に失敗しました。',
    })
  }

  return data as Event
})
