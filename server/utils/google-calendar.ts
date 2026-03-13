import dayjs from 'dayjs'
import type { ShioriWithDays, DayWithEvents, Event as ShioriEvent } from '~~/types/database'
import type { CalendarConflict } from '~~/shared/calendar-export-status'
import { getCategoryLabel } from '~~/shared/category-icons'

/** Google Calendar Event の作成リクエスト型 */
interface CalendarEventInsert {
  summary: string
  description?: string
  location?: string
  start: { dateTime?: string; date?: string; timeZone?: string }
  end: { dateTime?: string; date?: string; timeZone?: string }
  extendedProperties?: { private: Record<string, string> }
}

/** Google Calendar API のイベント型（検索結果用） */
interface CalendarEventItem {
  id: string
  summary?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
  extendedProperties?: { private?: Record<string, string> }
}

/** イベント作成/更新の結果 */
export interface CalendarEventResult {
  success: boolean
  title: string
  action?: 'created' | 'updated' | 'skipped'
  error?: string
}

/** 既存イベントの検出結果 */
export interface ExistingEventsInfo {
  count: number
  eventIdMap: Map<string, string> // shioriEventId → googleCalendarEventId
}

const TIMEZONE = 'Asia/Tokyo'
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

/** refresh_token から access_token を取得 */
export async function getGoogleAccessToken(refreshToken: string): Promise<string> {
  const config = useRuntimeConfig()

  const response = await $fetch<{ access_token: string }>(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    body: {
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    },
  })

  return response.access_token
}

/** しおりのイベントを Google Calendar Event 形式に変換（extendedProperties付き） */
export function mapShioriToCalendarEvents(
  shiori: ShioriWithDays,
): { event: CalendarEventInsert; shioriEventId: string }[] {
  const events: { event: CalendarEventInsert; shioriEventId: string }[] = []

  for (const day of shiori.days) {
    const resolvedDate = resolveDayDate(day, shiori.start_date)
    for (const ev of day.events) {
      events.push({
        event: mapSingleEvent(resolvedDate, ev, shiori.title, shiori.id),
        shioriEventId: ev.id,
      })
    }
  }

  return events
}

/** Dayの日付を解決: day.date → start_date + day_number から推定 → null */
function resolveDayDate(day: DayWithEvents, shioriStartDate: string | null): string | null {
  if (day.date) return day.date

  if (shioriStartDate) {
    return dayjs(shioriStartDate).add(day.day_number - 1, 'day').format('YYYY-MM-DD')
  }

  return null
}

/** 単一イベントを Google Calendar Event に変換 */
function mapSingleEvent(
  dayDate: string | null,
  ev: ShioriEvent,
  shioriTitle: string,
  shioriId: string,
): CalendarEventInsert {
  const description = buildDescription(ev, shioriTitle)
  const extendedProperties = {
    private: {
      shioriId,
      shioriEventId: ev.id,
    },
  }

  // 時間指定あり → dateTime、なし → 終日イベント
  if (dayDate && ev.start_time) {
    const startDateTime = `${dayDate}T${padTime(ev.start_time)}:00`
    const endDateTime = ev.end_time
      ? `${dayDate}T${padTime(ev.end_time)}:00`
      : `${dayDate}T${padTime(addOneHour(ev.start_time))}:00`

    return {
      summary: ev.title,
      description,
      location: ev.address || undefined,
      start: { dateTime: startDateTime, timeZone: TIMEZONE },
      end: { dateTime: endDateTime, timeZone: TIMEZONE },
      extendedProperties,
    }
  }

  const date = dayDate || new Date().toISOString().split('T')[0]!
  return {
    summary: ev.title,
    description,
    location: ev.address || undefined,
    start: { date },
    end: { date },
    extendedProperties,
  }
}

/** イベントの説明文を構築 */
function buildDescription(ev: ShioriEvent, shioriTitle: string): string {
  const parts: string[] = []

  parts.push(`[${getCategoryLabel(ev.category)}]`)

  if (ev.memo) {
    parts.push(ev.memo)
  }

  if (ev.url) {
    parts.push(`URL: ${ev.url}`)
  }

  parts.push(`---\nしおりっぷ: ${shioriTitle}`)

  return parts.join('\n')
}

/** 時刻を HH:MM 形式にパディング */
function padTime(time: string): string {
  const [h, m] = time.split(':')
  return `${h!.padStart(2, '0')}:${m!.padStart(2, '0')}`
}

/** 時刻に1時間加算（終了時間が未設定の場合のフォールバック） */
function addOneHour(time: string): string {
  const [h, m] = time.split(':').map(Number)
  // 23時以降は23:59にする（0分間イベント防止）
  if ((h ?? 0) >= 23) return '23:59'
  return `${String((h ?? 0) + 1).padStart(2, '0')}:${String(m ?? 0).padStart(2, '0')}`
}

/** Google Calendar からしおりに紐づく既存イベントを検索 */
export async function findExistingCalendarEvents(
  accessToken: string,
  shioriId: string,
): Promise<ExistingEventsInfo> {
  const eventIdMap = new Map<string, string>()

  // sharedExtendedProperty でフィルタ（private は privateExtendedProperty）
  const response = await $fetch<{ items?: CalendarEventItem[] }>(
    `${GOOGLE_CALENDAR_API}/calendars/primary/events`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      query: {
        privateExtendedProperty: `shioriId=${shioriId}`,
        maxResults: 2500,
        singleEvents: true,
        showDeleted: false,
      },
    },
  )

  if (response.items) {
    for (const item of response.items) {
      const shioriEventId = item.extendedProperties?.private?.shioriEventId
      if (shioriEventId) {
        eventIdMap.set(shioriEventId, item.id)
      }
    }
  }

  return { count: eventIdMap.size, eventIdMap }
}

/** Google Calendar API にイベントを登録（重複処理対応） */
export async function syncCalendarEvents(
  accessToken: string,
  events: { event: CalendarEventInsert; shioriEventId: string }[],
  existingEvents: ExistingEventsInfo,
  mode: 'add_new' | 'overwrite',
): Promise<CalendarEventResult[]> {
  const CHUNK_SIZE = 5
  const results: CalendarEventResult[] = []

  for (let i = 0; i < events.length; i += CHUNK_SIZE) {
    const chunk = events.slice(i, i + CHUNK_SIZE)

    const chunkResults = await Promise.all(
      chunk.map(async ({ event, shioriEventId }): Promise<CalendarEventResult> => {
        try {
          const existingGoogleId = existingEvents.eventIdMap.get(shioriEventId)

          if (existingGoogleId) {
            if (mode === 'add_new') {
              return { success: true, title: event.summary, action: 'skipped' }
            }
            // 上書きモード: 既存イベントを更新
            await $fetch(
              `${GOOGLE_CALENDAR_API}/calendars/primary/events/${encodeURIComponent(existingGoogleId)}`,
              {
                method: 'PUT',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: event,
              },
            )
            return { success: true, title: event.summary, action: 'updated' }
          }

          // 新規作成
          await $fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: event,
          })
          return { success: true, title: event.summary, action: 'created' }
        }
        catch (e) {
          const errorMsg = e instanceof Error ? e.message : String(e)
          return { success: false, title: event.summary, error: errorMsg }
        }
      }),
    )

    results.push(...chunkResults)
  }

  return results
}

/** 旅行日程に重なる既存のGoogleカレンダー予定を検出（しおりっぷ以外） */
export async function detectCalendarConflicts(
  accessToken: string,
  startDate: string,
  endDate: string,
  shioriId: string,
): Promise<CalendarConflict[]> {
  const conflicts: CalendarConflict[] = []

  try {
    // 日程範囲 +1日（終了日を含むため）
    const timeMin = `${startDate}T00:00:00+09:00`
    const timeMax = `${dayjs(endDate).add(1, 'day').format('YYYY-MM-DD')}T00:00:00+09:00`

    const response = await $fetch<{ items?: CalendarEventItem[] }>(
      `${GOOGLE_CALENDAR_API}/calendars/primary/events`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        query: {
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 100,
          showDeleted: false,
        },
      },
    )

    if (response.items) {
      for (const item of response.items) {
        // しおりっぷが作成したイベントは除外
        if (item.extendedProperties?.private?.shioriId === shioriId) continue

        const start = item.start
        if (!start) continue

        conflicts.push({
          summary: item.summary || '(タイトルなし)',
          date: start.date || start.dateTime?.split('T')[0] || '',
          startTime: start.dateTime ? start.dateTime.split('T')[1]?.slice(0, 5) : undefined,
          endTime: item.end?.dateTime ? item.end.dateTime.split('T')[1]?.slice(0, 5) : undefined,
        })
      }
    }
  }
  catch (e) {
    console.error('Failed to detect calendar conflicts:', e)
  }

  return conflicts
}
