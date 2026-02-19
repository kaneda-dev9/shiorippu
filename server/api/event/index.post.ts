import type { Event, EventCategory } from '~~/types/database'

/**
 * POST /api/event
 * 日程にイベントを追加する
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody<{
    day_id: string
    title: string
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

  if (!body?.day_id) {
    throw createError({
      statusCode: 400,
      statusMessage: '日程IDは必須です。',
    })
  }

  if (!body?.title?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'イベントタイトルは必須です。',
    })
  }

  if (body.title.length > 100) {
    throw createError({
      statusCode: 400,
      statusMessage: 'タイトルは100文字以内で入力してください。',
    })
  }

  const supabase = useServerSupabase()

  // day → shiori のオーナー権限チェック
  const { data: day } = await supabase
    .from('days')
    .select('shiori_id')
    .eq('id', body.day_id)
    .single()

  if (!day) {
    throw createError({ statusCode: 404, statusMessage: '日程が見つかりません。' })
  }

  const { data: shiori } = await supabase
    .from('shioris')
    .select('owner_id')
    .eq('id', day.shiori_id)
    .single()

  if (!shiori || shiori.owner_id !== user.id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'このしおりにイベントを追加する権限がありません。',
    })
  }

  // 現在の最大 sort_order を取得
  const { data: maxEvent } = await supabase
    .from('events')
    .select('sort_order')
    .eq('day_id', body.day_id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const nextSortOrder = (maxEvent?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('events')
    .insert({
      day_id: body.day_id,
      title: body.title.trim(),
      category: body.category || 'other',
      icon: body.icon || 'i-lucide-map-pin',
      start_time: body.start_time || null,
      end_time: body.end_time || null,
      memo: body.memo || null,
      url: body.url || null,
      place_id: body.place_id || null,
      lat: body.lat || null,
      lng: body.lng || null,
      address: body.address || null,
      booking_status: body.booking_status || 'none',
      sort_order: nextSortOrder,
    })
    .select()
    .single()

  if (error) {
    console.error('イベント作成エラー:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'イベントの作成に失敗しました。',
    })
  }

  setResponseStatus(event, 201)
  return data as Event
})
