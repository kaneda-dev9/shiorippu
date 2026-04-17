import type { ShioriWithRole, Day, Event, CollaboratorRole } from '~~/types/database'
import { useMutation, useQuery, useQueryCache } from '@pinia/colada'

// ロールバック用スナップショットは closure ref に保存する。
// Pinia Colada v1.1 の `_ReduceContext` が optional プロパティを含む TContext を潰してしまい
// `onError(_, _, ctx)` 経由では前値を受け取れないための回避策。同一 mutation の同時発火は無い前提。
export function useShioriEditor(shioriId: string) {
  const { authFetch } = useAuthFetch()
  const { session, loading: authLoading, user } = useAuth()
  const toast = useToast()
  const queryCache = useQueryCache()

  const detailKey = () => shioriKeys.detail(shioriId)

  const {
    data: shiori,
    asyncStatus,
    error: queryError,
  } = useQuery({
    key: detailKey,
    query: () => authFetch<ShioriWithRole>(`/api/shiori/${shioriId}`),
    // auth race 対策：セッション確立前に queryFn が走ると authFetch が throw する
    enabled: () => !authLoading.value && !!session.value,
    refetchOnWindowFocus: false,
    staleTime: 0,
  })

  const loading = computed(() => {
    if (authLoading.value) return true
    if (asyncStatus.value === 'loading') return true
    return !shiori.value && !queryError.value
  })

  watch(queryError, async (err) => {
    if (!err) return
    toast.add({ title: 'しおりの取得に失敗しました', color: 'error' })
    await navigateTo('/dashboard')
  })

  const userRole = computed<CollaboratorRole | null>(() => shiori.value?.userRole ?? null)
  const isOwner = computed(() => userRole.value === 'owner')

  function snapshotShiori(): ShioriWithRole | undefined {
    const current = queryCache.getQueryData<ShioriWithRole>(detailKey())
    return current ? structuredClone(current) : undefined
  }

  function patchShiori(updater: (old: ShioriWithRole) => ShioriWithRole) {
    const current = queryCache.getQueryData<ShioriWithRole>(detailKey())
    if (!current) return
    queryCache.setQueryData<ShioriWithRole>(detailKey(), updater(current))
  }

  function restoreShiori(snapshot: ShioriWithRole | undefined) {
    if (!snapshot) return
    queryCache.setQueryData<ShioriWithRole>(detailKey(), snapshot)
  }

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

  const otherOnlineUsers = computed(() =>
    onlineUsers.value.filter((u) => u.user_id !== user.value?.id),
  )

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

  // SectionChatPanel の @plan-applied で AI 適用後の最新状態を取りにいくためのハンドラ
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
