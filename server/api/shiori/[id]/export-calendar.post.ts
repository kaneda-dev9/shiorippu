import type { ShioriWithDays } from '~~/types/database'
import type { CalendarConflict, CalendarExportResult } from '~~/shared/calendar-export-status'
import { CalendarExportStatuses as S } from '~~/shared/calendar-export-status'

/** しおりのイベントをGoogleカレンダーにエクスポート */
export default defineEventHandler(async (event): Promise<CalendarExportResult> => {
  const shioriId = getRouterParam(event, 'id')
  if (!shioriId) {
    throw createError({ statusCode: 400, statusMessage: 'しおりIDが指定されていません。' })
  }
  const { user } = await requireShioriAccess(event, shioriId)

  const body = await readBody<{ mode?: 'add_new' | 'overwrite' | 'check' }>(event)
  const mode = body?.mode || 'check'

  const supabase = useServerSupabase()

  // しおりデータ取得（days + events）
  const { data: shiori, error: shioriError } = await supabase
    .from('shioris')
    .select(`
      *,
      days (
        *,
        events (*)
      )
    `)
    .eq('id', shioriId)
    .single()

  if (shioriError || !shiori) {
    throw createError({ statusCode: 404, statusMessage: 'しおりが見つかりません。' })
  }

  // days を day_number でソート、events を sort_order でソート
  // Supabase のジョイン結果型と ShioriWithDays の構造は一致するが、型推論が追いつかないためキャスト
  const shioriWithDays = shiori as ShioriWithDays & { last_calendar_exported_at?: string | null }
  shioriWithDays.days.sort((a, b) => a.day_number - b.day_number)
  for (const day of shioriWithDays.days) {
    day.events.sort((a, b) => a.sort_order - b.sort_order)
  }

  // Google refresh_token 取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('google_refresh_token')
    .eq('id', user.id)
    .single()

  if (!profile?.google_refresh_token) {
    return { status: S.NeedsAuth }
  }

  // refresh_token を復号
  let refreshToken: string
  try {
    refreshToken = decryptToken(profile.google_refresh_token)
  }
  catch {
    return { status: S.NeedsReauth, message: 'トークンの復号に失敗しました。再認証してください。' }
  }

  // access_token を取得
  let accessToken: string
  try {
    accessToken = await getGoogleAccessToken(refreshToken)
  }
  catch (e) {
    console.error('Failed to get Google access token:', e)
    return { status: S.NeedsReauth, message: 'Googleの認証が期限切れです。再接続してください。' }
  }

  // しおりデータ → Google Calendar Event に変換
  const calendarEvents = mapShioriToCalendarEvents(shioriWithDays)

  if (calendarEvents.length === 0) {
    return { status: S.Success, count: 0 }
  }

  // 既存イベントを検索
  const existingEvents = await findExistingCalendarEvents(accessToken, shioriId)

  // check モード: 既存イベント・コンフリクトの情報を返す（登録はしない）
  if (mode === 'check') {
    const startDate = shioriWithDays.start_date
    const endDate = shioriWithDays.end_date || startDate
    let conflicts: CalendarConflict[] = []
    if (startDate && endDate) {
      conflicts = await detectCalendarConflicts(accessToken, startDate, endDate, shioriId)
    }

    if (existingEvents.count > 0 || conflicts.length > 0) {
      return {
        status: S.HasExisting,
        existingCount: existingEvents.count,
        lastExportedAt: shioriWithDays.last_calendar_exported_at || null,
        conflicts,
      }
    }

    return { status: S.Ready }
  }

  // イベント登録/更新
  const results = await syncCalendarEvents(accessToken, calendarEvents, existingEvents, mode)

  const counts = results.reduce((acc, r) => {
    if (r.success) acc.succeeded++
    else acc.failed++
    if (r.action === 'created') acc.created++
    else if (r.action === 'updated') acc.updated++
    else if (r.action === 'skipped') acc.skipped++
    return acc
  }, { succeeded: 0, failed: 0, created: 0, updated: 0, skipped: 0 })
  const { succeeded, failed, created, updated, skipped } = counts

  // エクスポート日時を更新
  if (succeeded > 0) {
    const { error: exportDateError } = await supabase
      .from('shioris')
      .update({ last_calendar_exported_at: new Date().toISOString() })
      .eq('id', shioriId)
    if (exportDateError) {
      console.error('エクスポート日時の更新に失敗:', exportDateError)
    }
  }

  if (failed === 0) {
    return { status: S.Success, count: succeeded, created, updated, skipped }
  }

  if (succeeded === 0) {
    return { status: S.Error, message: 'Googleカレンダーへの登録に失敗しました。' }
  }

  return { status: S.Partial, succeeded, failed, created, updated, skipped }
})
