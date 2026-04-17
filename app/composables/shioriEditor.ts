import type { ShioriWithRole, Day, Event, CollaboratorRole } from '~~/types/database'
import { useMutation, useQuery, useQueryCache } from '@pinia/colada'

/**
 * しおりエディタのデータ操作を管理する composable
 * - useQuery でしおり取得（認証準備完了まで待機）
 * - Realtime同期はキャッシュへ setQueryData で反映
 * - CRUD は useMutation + 楽観的更新 + ロールバック
 *
 * ロールバック実装について:
 *   Pinia Colada v1.1 の `_ReduceContext` 型が `Record<any,any> extends TContext` の
 *   条件で TContext を `_EmptyObject` に潰してしまい、`onError(_,_,ctx)` の ctx 経由で
 *   previous を受け取れない。そのためスナップショットを mutation スコープ内の
 *   closure ref に保存する方式とする。同時実行はしない前提。
 */
export function useShioriEditor(shioriId: string) {
  const { authFetch } = useAuthFetch()
  const { session, loading: authLoading, user } = useAuth()
  const toast = useToast()
  const queryCache = useQueryCache()

  const detailKey = () => shioriKeys.detail(shioriId)

  // --- しおり取得（useQuery） ---
  const {
    data: shiori,
    asyncStatus,
    error: queryError,
  } = useQuery({
    key: detailKey,
    query: () => authFetch<ShioriWithRole>(`/api/shiori/${shioriId}`),
    // 認証初期化完了後かつセッション確立後のみ実行（auth race 対策）
    enabled: () => !authLoading.value && !!session.value,
    refetchOnWindowFocus: false,
    staleTime: 0,
  })

  const loading = computed(() => {
    if (authLoading.value) return true
    if (asyncStatus.value === 'loading') return true
    return !shiori.value && !queryError.value
  })

  // クエリ失敗時は dashboard に戻す
  watch(queryError, async (err) => {
    if (!err) return
    toast.add({ title: 'しおりの取得に失敗しました', color: 'error' })
    await navigateTo('/dashboard')
  })

  // 派生状態
  const userRole = computed<CollaboratorRole | null>(() => shiori.value?.userRole ?? null)
  const isOwner = computed(() => userRole.value === 'owner')

  // --- 共通ヘルパ ---
  /** キャッシュから現在のしおりを snapshot（structuredClone で完全独立） */
  function snapshotShiori(): ShioriWithRole | undefined {
    const current = queryCache.getQueryData<ShioriWithRole>(detailKey())
    return current ? structuredClone(current) : undefined
  }

  /** キャッシュに updater を適用する薄いラッパ。キャッシュ未構築時は何もしない */
  function patchShiori(updater: (old: ShioriWithRole) => ShioriWithRole) {
    const current = queryCache.getQueryData<ShioriWithRole>(detailKey())
    if (!current) return
    queryCache.setQueryData<ShioriWithRole>(detailKey(), updater(current))
  }

  /** スナップショットを復元（ロールバック） */
  function restoreShiori(snapshot: ShioriWithRole | undefined) {
    if (!snapshot) return
    queryCache.setQueryData<ShioriWithRole>(detailKey(), snapshot)
  }

  // --- Realtime 同期（setQueryData 経由でキャッシュ更新） ---
  const { onlineUsers, addPendingOp } = useRealtimeSync({
    shioriId,
    onShioriChange(payload) {
      patchShiori((old) => ({
        ...old,
        title: payload.new.title,
        start_date: payload.new.start_date,
        end_date: payload.new.end_date,
        area: payload.new.area,
        is_public: payload.new.is_public,
        invite_enabled: payload.new.invite_enabled,
        invite_token: payload.new.invite_token,
        template_id: payload.new.template_id,
        cover_image_url: payload.new.cover_image_url,
      }))
    },
    onDayChange(payload) {
      patchShiori((old) => {
        const days = [...old.days]
        if (payload.eventType === 'INSERT') {
          if (!days.some((d) => d.id === payload.new.id)) {
            days.push({ ...payload.new, events: [] })
            days.sort((a, b) => a.sort_order - b.sort_order)
          }
          return { ...old, days }
        }
        if (payload.eventType === 'UPDATE') {
          const idx = days.findIndex((d) => d.id === payload.new.id)
          if (idx >= 0) {
            days[idx] = { ...payload.new, events: days[idx]!.events }
          }
          days.sort((a, b) => a.sort_order - b.sort_order)
          return { ...old, days }
        }
        // DELETE
        return { ...old, days: days.filter((d) => d.id !== payload.old.id) }
      })
    },
    onEventChange(payload) {
      patchShiori((old) => {
        const days = old.days.map((d) => ({ ...d, events: [...d.events] }))

        if (payload.eventType === 'INSERT') {
          const day = days.find((d) => d.id === payload.new.day_id)
          if (day && !day.events.some((e) => e.id === payload.new.id)) {
            day.events.push(payload.new)
            day.events.sort((a, b) => a.sort_order - b.sort_order)
          }
        }
        else if (payload.eventType === 'UPDATE') {
          // 旧Dayから削除 / 新Dayへ挿入
          for (const day of days) {
            const idx = day.events.findIndex((e) => e.id === payload.new.id)
            if (idx >= 0) {
              if (day.id === payload.new.day_id) {
                day.events[idx] = payload.new
              }
              else {
                day.events.splice(idx, 1)
              }
            }
          }
          const targetDay = days.find((d) => d.id === payload.new.day_id)
          if (targetDay && !targetDay.events.some((e) => e.id === payload.new.id)) {
            targetDay.events.push(payload.new)
          }
          for (const day of days) {
            day.events.sort((a, b) => a.sort_order - b.sort_order)
          }
        }
        else if (payload.eventType === 'DELETE') {
          for (const day of days) {
            day.events = day.events.filter((e) => e.id !== payload.old.id)
          }
        }
        return { ...old, days }
      })
    },
  })

  // 自分以外のオンラインユーザー
  const otherOnlineUsers = computed(() =>
    onlineUsers.value.filter((u) => u.user_id !== user.value?.id),
  )

  // --- saveTitle ---
  let saveTitleRollback: ShioriWithRole | undefined
  const saveTitleMutation = useMutation({
    mutation: (title: string) => authFetch(`/api/shiori/${shioriId}`, {
      method: 'PUT',
      body: { title: title.trim() },
    }),
    onMutate(title: string) {
      queryCache.cancelQueries({ key: detailKey() })
      saveTitleRollback = snapshotShiori()
      addPendingOp(shioriId)
      patchShiori((old) => ({ ...old, title: title.trim() }))
    },
    onError() {
      restoreShiori(saveTitleRollback)
      saveTitleRollback = undefined
      toast.add({ title: 'タイトルの更新に失敗しました', color: 'error' })
    },
    onSuccess() {
      saveTitleRollback = undefined
    },
  })

  async function saveTitle(title: string) {
    if (!shiori.value || !title.trim()) return
    try {
      await saveTitleMutation.mutateAsync(title)
    }
    catch {
      // onError で処理済み
    }
  }

  // --- saveDates ---
  type DatesVars = { startDate: string | null; endDate: string | null }
  let saveDatesRollback: ShioriWithRole | undefined
  const saveDatesMutation = useMutation({
    mutation: ({ startDate, endDate }: DatesVars) => authFetch(`/api/shiori/${shioriId}`, {
      method: 'PUT',
      body: { start_date: startDate, end_date: endDate },
    }),
    onMutate({ startDate, endDate }: DatesVars) {
      queryCache.cancelQueries({ key: detailKey() })
      saveDatesRollback = snapshotShiori()
      addPendingOp(shioriId)
      patchShiori((old) => ({ ...old, start_date: startDate, end_date: endDate }))
    },
    onError() {
      restoreShiori(saveDatesRollback)
      saveDatesRollback = undefined
      toast.add({ title: '日程の更新に失敗しました', color: 'error' })
    },
    onSuccess() {
      saveDatesRollback = undefined
    },
  })

  async function saveDates(startDate: string | null, endDate: string | null) {
    if (!shiori.value) return
    try {
      await saveDatesMutation.mutateAsync({ startDate, endDate })
    }
    catch {
      // onError 済み
    }
  }

  // --- changeCoverImage ---
  let changeCoverRollback: ShioriWithRole | undefined
  const changeCoverImageMutation = useMutation({
    mutation: (coverImageUrl: string | null) => authFetch(`/api/shiori/${shioriId}`, {
      method: 'PUT',
      body: { cover_image_url: coverImageUrl },
    }),
    onMutate(coverImageUrl: string | null) {
      queryCache.cancelQueries({ key: detailKey() })
      changeCoverRollback = snapshotShiori()
      addPendingOp(shioriId)
      patchShiori((old) => ({ ...old, cover_image_url: coverImageUrl }))
    },
    onSuccess() {
      changeCoverRollback = undefined
      toast.add({ title: 'カバー画像を変更しました', color: 'success' })
    },
    onError() {
      restoreShiori(changeCoverRollback)
      changeCoverRollback = undefined
      toast.add({ title: 'カバー画像の変更に失敗しました', color: 'error' })
    },
  })

  async function changeCoverImage(coverImageUrl: string | null) {
    if (!shiori.value) return
    try {
      await changeCoverImageMutation.mutateAsync(coverImageUrl)
    }
    catch {
      // onError 済み
    }
  }

  // --- deleteShiori ---
  const deleteShioriMutation = useMutation({
    mutation: () => authFetch(`/api/shiori/${shioriId}`, { method: 'DELETE' }),
    async onSuccess() {
      toast.add({ title: 'しおりを削除しました', color: 'success' })
      await navigateTo('/dashboard')
    },
    onError() {
      toast.add({ title: 'しおりの削除に失敗しました', color: 'error' })
    },
  })

  async function deleteShiori() {
    try {
      await deleteShioriMutation.mutateAsync()
    }
    catch {
      // onError 済み
    }
  }

  // --- addDay ---
  const addDayMutation = useMutation({
    mutation: () => {
      const nextNumber = (shiori.value?.days.length ?? 0) + 1
      return authFetch<Day>('/api/day', {
        method: 'POST',
        body: { shiori_id: shioriId, day_number: nextNumber },
      })
    },
    onSuccess(day) {
      addPendingOp(day.id)
      patchShiori((old) => {
        if (old.days.some((d) => d.id === day.id)) return old
        const days = [...old.days, { ...day, events: [] }]
        days.sort((a, b) => a.sort_order - b.sort_order)
        return { ...old, days }
      })
      toast.add({ title: `Day ${day.day_number} を追加しました`, color: 'success' })
    },
    onError() {
      toast.add({ title: '日程の追加に失敗しました', color: 'error' })
    },
  })

  /** 日程を追加（追加された Day の ID を返す） */
  async function addDay(): Promise<string | undefined> {
    if (!shiori.value) return
    try {
      const day = await addDayMutation.mutateAsync()
      return day.id
    }
    catch {
      return undefined
    }
  }

  // --- deleteDay ---
  type DeleteDayVars = { dayId: string; dayNumber: number }
  let deleteDayRollback: ShioriWithRole | undefined
  const deleteDayMutation = useMutation({
    mutation: ({ dayId }: DeleteDayVars) => authFetch(`/api/day/${dayId}`, { method: 'DELETE' }),
    onMutate({ dayId }: DeleteDayVars) {
      queryCache.cancelQueries({ key: detailKey() })
      deleteDayRollback = snapshotShiori()
      addPendingOp(dayId)
      patchShiori((old) => ({ ...old, days: old.days.filter((d) => d.id !== dayId) }))
    },
    onSuccess(_data, { dayNumber }) {
      deleteDayRollback = undefined
      toast.add({ title: `Day ${dayNumber} を削除しました`, color: 'success' })
    },
    onError() {
      restoreShiori(deleteDayRollback)
      deleteDayRollback = undefined
      toast.add({ title: '日程の削除に失敗しました', color: 'error' })
    },
  })

  async function deleteDay(dayId: string, dayNumber: number) {
    if (!shiori.value) return
    try {
      await deleteDayMutation.mutateAsync({ dayId, dayNumber })
    }
    catch {
      // onError 済み
    }
  }

  // --- onEventSaved（EventFormModal 保存完了後にキャッシュへ反映） ---
  function onEventSaved(savedEvent: Event) {
    addPendingOp(savedEvent.id)
    patchShiori((old) => {
      const days = old.days.map((d) => ({ ...d, events: [...d.events] }))

      // 元のDayから削除（Day間移動対応）
      for (const day of days) {
        const idx = day.events.findIndex((e) => e.id === savedEvent.id)
        if (idx >= 0 && day.id !== savedEvent.day_id) {
          day.events.splice(idx, 1)
        }
      }

      const targetDay = days.find((d) => d.id === savedEvent.day_id)
      if (!targetDay) return { ...old, days }

      const eventIndex = targetDay.events.findIndex((e) => e.id === savedEvent.id)
      if (eventIndex >= 0) {
        targetDay.events[eventIndex] = savedEvent
      }
      else {
        targetDay.events.push(savedEvent)
      }
      return { ...old, days }
    })
  }

  // --- deleteEvent ---
  type DeleteEventVars = { dayId: string; eventId: string }
  let deleteEventRollback: ShioriWithRole | undefined
  const deleteEventMutation = useMutation({
    mutation: ({ eventId }: DeleteEventVars) => authFetch(`/api/event/${eventId}`, { method: 'DELETE' }),
    onMutate({ dayId, eventId }: DeleteEventVars) {
      queryCache.cancelQueries({ key: detailKey() })
      deleteEventRollback = snapshotShiori()
      addPendingOp(eventId)
      patchShiori((old) => {
        const days = old.days.map((d) => {
          if (d.id !== dayId) return d
          return { ...d, events: d.events.filter((e) => e.id !== eventId) }
        })
        return { ...old, days }
      })
    },
    onSuccess() {
      deleteEventRollback = undefined
      toast.add({ title: 'イベントを削除しました', color: 'success' })
    },
    onError() {
      restoreShiori(deleteEventRollback)
      deleteEventRollback = undefined
      toast.add({ title: 'イベントの削除に失敗しました', color: 'error' })
    },
  })

  async function deleteEvent(dayId: string, eventId: string) {
    if (!shiori.value) return
    try {
      await deleteEventMutation.mutateAsync({ dayId, eventId })
    }
    catch {
      // onError 済み
    }
  }

  // --- reorderDays ---
  let reorderDaysRollback: ShioriWithRole | undefined
  const reorderDaysMutation = useMutation({
    mutation: () => {
      const current = queryCache.getQueryData<ShioriWithRole>(detailKey())
      const order = (current?.days ?? []).map((d, i) => ({ id: d.id, sort_order: i }))
      return authFetch('/api/day/reorder', {
        method: 'POST',
        body: { shiori_id: shioriId, order },
      })
    },
    onMutate() {
      queryCache.cancelQueries({ key: detailKey() })
      reorderDaysRollback = snapshotShiori()
      // 現キャッシュの days 並びに sort_order / day_number を付与
      patchShiori((old) => {
        const days = old.days.map((d, i) => ({
          ...d,
          sort_order: i,
          day_number: i + 1,
        }))
        for (const d of days) addPendingOp(d.id)
        return { ...old, days }
      })
    },
    onSuccess() {
      reorderDaysRollback = undefined
    },
    onError() {
      restoreShiori(reorderDaysRollback)
      reorderDaysRollback = undefined
      toast.add({ title: '日程の並び替えに失敗しました', color: 'error' })
    },
    async onSettled() {
      await queryCache.invalidateQueries({ key: detailKey() })
    },
  })

  async function reorderDays() {
    if (!shiori.value) return
    try {
      await reorderDaysMutation.mutateAsync()
    }
    catch {
      // onError 済み
    }
  }

  // --- reorderEvents ---
  let reorderEventsRollback: ShioriWithRole | undefined
  const reorderEventsMutation = useMutation({
    mutation: () => {
      const current = queryCache.getQueryData<ShioriWithRole>(detailKey())
      const order: { id: string; day_id: string; sort_order: number }[] = []
      for (const day of current?.days ?? []) {
        day.events.forEach((ev, i) => {
          order.push({ id: ev.id, day_id: day.id, sort_order: i })
        })
      }
      return authFetch('/api/event/reorder', {
        method: 'POST',
        body: { shiori_id: shioriId, order },
      })
    },
    onMutate() {
      queryCache.cancelQueries({ key: detailKey() })
      reorderEventsRollback = snapshotShiori()
      patchShiori((old) => {
        const days = old.days.map((day) => {
          const events = day.events.map((ev, i) => ({
            ...ev,
            sort_order: i,
            day_id: day.id,
          }))
          for (const ev of events) addPendingOp(ev.id)
          return { ...day, events }
        })
        return { ...old, days }
      })
    },
    onSuccess() {
      reorderEventsRollback = undefined
    },
    onError() {
      restoreShiori(reorderEventsRollback)
      reorderEventsRollback = undefined
      toast.add({ title: 'イベントの並び替えに失敗しました', color: 'error' })
    },
    async onSettled() {
      await queryCache.invalidateQueries({ key: detailKey() })
    },
  })

  async function reorderEvents() {
    if (!shiori.value) return
    try {
      await reorderEventsMutation.mutateAsync()
    }
    catch {
      // onError 済み
    }
  }

  /**
   * しおりデータを再取得（キャッシュを invalidate）。
   * 以前の `fetchShiori` と互換目的で残す。
   */
  async function fetchShiori() {
    await queryCache.invalidateQueries({ key: detailKey() })
  }

  return {
    // データ
    shiori,
    loading,
    userRole,
    // 派生状態
    isOwner,
    otherOnlineUsers,
    // 操作
    fetchShiori,
    saveTitle,
    saveDates,
    addDay,
    deleteDay,
    onEventSaved,
    deleteEvent,
    reorderDays,
    reorderEvents,
    deleteShiori,
    changeCoverImage,
  }
}
