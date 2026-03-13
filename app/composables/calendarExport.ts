import type { CalendarConflict, CalendarExportResult } from '~~/shared/calendar-export-status'
import { CalendarExportStatuses } from '~~/shared/calendar-export-status'

/** Googleカレンダーエクスポートの状態管理とフロー制御 */
export function useCalendarExport() {
  const { authFetch } = useAuthFetch()
  const supabase = useSupabase()
  const toast = useToast()
  const config = useRuntimeConfig()

  const exporting = ref<boolean>(false)
  const needsAuth = ref<boolean>(false)
  const existingInfo = ref<{
    count: number
    lastExportedAt: string | null
    conflicts: CalendarConflict[]
  } | null>(null)

  /** APIを呼び出す共通関数 */
  async function callExportApi(shioriId: string, mode: 'check' | 'add_new' | 'overwrite'): Promise<CalendarExportResult | null> {
    try {
      return await authFetch<CalendarExportResult>(
        `/api/shiori/${shioriId}/export-calendar`,
        { method: 'POST', body: { mode } },
      )
    }
    catch (e) {
      console.error('Calendar export error:', e)
      toast.add({ title: 'エクスポートに失敗しました', color: 'error' })
      return null
    }
  }

  /** 既存イベント・コンフリクトをチェック（エクスポートはしない） */
  async function checkBeforeExport(shioriId: string): Promise<'ok' | 'has_existing' | 'needs_auth' | 'error'> {
    if (exporting.value) return 'error'
    exporting.value = true

    try {
      const result = await callExportApi(shioriId, 'check')
      if (!result) return 'error'

      if (result.status === CalendarExportStatuses.NeedsAuth || result.status === CalendarExportStatuses.NeedsReauth) {
        needsAuth.value = true
        return 'needs_auth'
      }

      if (result.status === CalendarExportStatuses.HasExisting) {
        existingInfo.value = {
          count: result.existingCount || 0,
          lastExportedAt: result.lastExportedAt || null,
          conflicts: result.conflicts || [],
        }
        return 'has_existing'
      }

      if (result.status === CalendarExportStatuses.Ready) {
        return 'ok'
      }

      // 想定外のステータス
      return 'error'
    }
    finally {
      exporting.value = false
    }
  }

  /** 既存イベントがある場合のエクスポート（モード指定） */
  async function exportWithMode(shioriId: string, mode: 'add_new' | 'overwrite') {
    if (exporting.value) return
    exporting.value = true

    try {
      const result = await callExportApi(shioriId, mode)
      if (!result) return

      if (result.status === CalendarExportStatuses.NeedsAuth || result.status === CalendarExportStatuses.NeedsReauth) {
        needsAuth.value = true
        return
      }

      handleExportResult(result)
      existingInfo.value = null
    }
    finally {
      exporting.value = false
    }
  }

  /** 結果の件数サマリーを構築 */
  function buildResultParts(result: CalendarExportResult): string[] {
    const parts: string[] = []
    if (result.created) parts.push(`${result.created}件追加`)
    if (result.updated) parts.push(`${result.updated}件更新`)
    if (result.skipped) parts.push(`${result.skipped}件スキップ`)
    return parts
  }

  /** エクスポート結果のtoast表示 */
  function handleExportResult(result: CalendarExportResult) {
    switch (result.status) {
      case CalendarExportStatuses.Success: {
        if (result.count === 0) {
          toast.add({ title: 'エクスポートするイベントがありません', color: 'warning' })
          break
        }
        const parts = buildResultParts(result)
        toast.add({ title: parts.join('、') || `${result.count}件処理しました`, color: 'success' })
        break
      }

      case CalendarExportStatuses.Partial: {
        const parts = buildResultParts(result)
        toast.add({
          title: `${parts.join('、')}（${result.failed}件失敗）`,
          color: 'warning',
        })
        break
      }

      case CalendarExportStatuses.Error:
        toast.add({ title: result.message || 'エクスポートに失敗しました', color: 'error' })
        break
    }
  }

  /** Calendar スコープ付きでGoogle再認証 */
  async function connectGoogleCalendar(redirectTo: string) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${config.public.appUrl}/auth/callback?redirect=${encodeURIComponent(redirectTo)}&calendar_connected=true`,
        scopes: 'https://www.googleapis.com/auth/calendar.events',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) {
      console.error('Google Calendar auth error:', error)
      toast.add({ title: 'Google認証に失敗しました', color: 'error' })
    }
  }

  return {
    exporting,
    needsAuth,
    existingInfo,
    checkBeforeExport,
    exportWithMode,
    connectGoogleCalendar,
  }
}
