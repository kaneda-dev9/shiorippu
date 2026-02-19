import type { TripPlan, EventCategory, DayWithEvents } from '~~/types/database'

/** 有効なカテゴリ一覧 */
const VALID_CATEGORIES: EventCategory[] = [
  'transport_train', 'transport_car', 'transport_plane',
  'transport_bus', 'transport_walk', 'transport_ship',
  'meal_restaurant', 'meal_cafe', 'meal_izakaya',
  'stay_hotel', 'stay_ryokan', 'stay_camp',
  'sightseeing_temple', 'sightseeing_theme_park',
  'sightseeing_beach', 'sightseeing_park', 'sightseeing_museum',
  'onsen', 'shopping', 'photo_spot',
  'activity', 'memo', 'other',
]

/**
 * POST /api/shiori/:id/apply-plan
 * AIプランをしおりに適用（Day + Event を一括作成）
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'しおりIDが指定されていません。',
    })
  }

  const user = await requireAuth(event)
  const supabase = useServerSupabase()

  // オーナー権限チェック
  const { data: shiori } = await supabase
    .from('shioris')
    .select('owner_id')
    .eq('id', id)
    .single()

  if (!shiori || shiori.owner_id !== user.id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'このしおりを編集する権限がありません。',
    })
  }

  const body = await readBody<{ plan: TripPlan }>(event)

  if (!body?.plan?.days?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'プランデータが不正です。',
    })
  }

  // 既存のDay/Eventを削除（上書きモード）
  const { data: existingDays } = await supabase
    .from('days')
    .select('id')
    .eq('shiori_id', id)

  if (existingDays && existingDays.length > 0) {
    const dayIds = existingDays.map((d) => d.id)

    // イベントを先に削除
    const { error: deleteEventsError } = await supabase
      .from('events')
      .delete()
      .in('day_id', dayIds)

    if (deleteEventsError) {
      console.error('既存イベント削除エラー:', deleteEventsError)
      throw createError({
        statusCode: 500,
        statusMessage: 'プランの適用に失敗しました。',
      })
    }

    // 日程を削除
    const { error: deleteDaysError } = await supabase
      .from('days')
      .delete()
      .eq('shiori_id', id)

    if (deleteDaysError) {
      console.error('既存日程削除エラー:', deleteDaysError)
      throw createError({
        statusCode: 500,
        statusMessage: 'プランの適用に失敗しました。',
      })
    }
  }

  // Day を一括INSERT
  const dayInserts = body.plan.days.map((day, index) => ({
    shiori_id: id,
    day_number: day.day_number,
    date: day.date || null,
    sort_order: index,
  }))

  const { data: createdDays, error: daysError } = await supabase
    .from('days')
    .insert(dayInserts)
    .select()

  if (daysError || !createdDays) {
    console.error('日程作成エラー:', daysError)
    throw createError({
      statusCode: 500,
      statusMessage: 'プランの適用に失敗しました。',
    })
  }

  // sort_order → day_id のマッピング
  const sortOrderToDayId = new Map(
    createdDays.map((d) => [d.sort_order, d.id] as [number, string]),
  )

  // Event を一括INSERT
  const eventInserts: {
    day_id: string
    title: string
    category: EventCategory
    icon: string
    start_time: string | null
    end_time: string | null
    memo: string | null
    address: string | null
    sort_order: number
  }[] = []

  for (let dayIndex = 0; dayIndex < body.plan.days.length; dayIndex++) {
    const planDay = body.plan.days[dayIndex]!
    const dayId = sortOrderToDayId.get(dayIndex)
    if (!dayId) continue

    for (let evIndex = 0; evIndex < planDay.events.length; evIndex++) {
      const planEvent = planDay.events[evIndex]!
      const category = VALID_CATEGORIES.includes(planEvent.category)
        ? planEvent.category
        : 'other'

      eventInserts.push({
        day_id: dayId,
        title: planEvent.title,
        category,
        icon: '',
        start_time: planEvent.start_time || null,
        end_time: planEvent.end_time || null,
        memo: planEvent.memo || null,
        address: planEvent.address || null,
        sort_order: evIndex,
      })
    }
  }

  let createdEvents: typeof eventInserts = []

  if (eventInserts.length > 0) {
    const { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .insert(eventInserts)
      .select()

    if (eventsError) {
      console.error('イベント作成エラー:', eventsError)
      throw createError({
        statusCode: 500,
        statusMessage: 'イベントの作成に失敗しました。',
      })
    }
    createdEvents = eventsData || []
  }

  // レスポンスを組み立て
  const result: DayWithEvents[] = createdDays.map((day) => ({
    ...day,
    events: createdEvents.filter((e) => e.day_id === day.id),
  }))

  setResponseStatus(event, 201)
  return result
})
