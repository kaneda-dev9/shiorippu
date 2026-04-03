/** コンフリクト（既存予定）の情報 */
export interface CalendarConflict {
  summary: string
  date: string
  startTime?: string
  endTime?: string
}

/** カレンダーエクスポートAPIのステータス */
export const CalendarExportStatuses = {
  Success: 'success',
  Partial: 'partial',
  Error: 'error',
  NeedsAuth: 'needs_auth',
  NeedsReauth: 'needs_reauth',
  HasExisting: 'has_existing',
  Ready: 'ready',
} as const

export type CalendarExportStatus = typeof CalendarExportStatuses[keyof typeof CalendarExportStatuses]

/** カレンダーエクスポートAPIのレスポンス型 */
export interface CalendarExportResult {
  status: CalendarExportStatus
  count?: number
  succeeded?: number
  failed?: number
  skipped?: number
  updated?: number
  created?: number
  existingCount?: number
  lastExportedAt?: string | null
  conflicts?: CalendarConflict[]
  message?: string
}
