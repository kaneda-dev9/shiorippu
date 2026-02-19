import type { Shiori, Day, Event, ShioriWithDays, DayWithEvents } from '~~/types/database'

/**
 * GET /api/shiori/:id
 * しおりの詳細を days, events と共に取得
 * 認証済みユーザー: 自分のしおり or コラボレーター
 * 未認証: 公開しおりのみ
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'しおりIDが指定されていません。',
    })
  }

  const supabase = useServerSupabase()

  // しおり本体を取得
  const { data: shiori, error: shioriError } = await supabase
    .from('shioris')
    .select('*')
    .eq('id', id)
    .single()

  if (shioriError || !shiori) {
    throw createError({
      statusCode: 404,
      statusMessage: 'しおりが見つかりません。',
    })
  }

  // アクセス権チェック: 公開 or オーナー or コラボレーター
  if (!shiori.is_public) {
    const authorization = getHeader(event, 'authorization')
    if (!authorization) {
      throw createError({ statusCode: 401, statusMessage: '認証が必要です。' })
    }
    const user = await requireAuth(event)
    if (shiori.owner_id !== user.id) {
      const { data: collab } = await supabase
        .from('collaborators')
        .select('id')
        .eq('shiori_id', id)
        .eq('user_id', user.id)
        .single()
      if (!collab) {
        throw createError({ statusCode: 403, statusMessage: 'アクセス権限がありません。' })
      }
    }
  }

  // days + events を取得
  const { data: days } = await supabase
    .from('days')
    .select('*')
    .eq('shiori_id', id)
    .order('sort_order', { ascending: true })

  const dayIds = (days || []).map((d: Day) => d.id)
  let events: Event[] = []

  if (dayIds.length > 0) {
    const { data: eventsData } = await supabase
      .from('events')
      .select('*')
      .in('day_id', dayIds)
      .order('sort_order', { ascending: true })

    events = eventsData || []
  }

  const daysWithEvents: DayWithEvents[] = (days || []).map((day: Day) => ({
    ...day,
    events: events.filter((e: Event) => e.day_id === day.id),
  }))

  return {
    ...(shiori as Shiori),
    days: daysWithEvents,
  } as ShioriWithDays
})
