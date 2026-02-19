import { createClient } from '@supabase/supabase-js'
import type { Shiori, Day, Event, ShioriWithDays, DayWithEvents } from '~~/types/database'

/**
 * GET /api/shiori/:id
 * しおりの詳細を days, events と共に取得
 * 認証は任意（公開しおりは未認証でも閲覧可能）
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'しおりIDが指定されていません。',
    })
  }

  // 認証は任意（RLS で制御）
  const authorization = getHeader(event, 'authorization')
  let supabase

  if (authorization) {
    supabase = useSupabaseWithAuth(event)
  } else {
    const config = useRuntimeConfig()
    supabase = createClient(
      config.public.supabaseUrl,
      config.public.supabaseAnonKey,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
  }

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
