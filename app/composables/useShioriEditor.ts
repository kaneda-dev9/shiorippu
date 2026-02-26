import type { ShioriWithRole, Day, Event, CollaboratorRole } from '~~/types/database'
import { getTemplate } from '~~/shared/templates'

/**
 * しおりエディタのデータ操作を管理する composable
 * - しおりデータの取得・更新
 * - Day/イベントの CRUD
 * - 並び替え（ドラッグ&ドロップ）
 * - Realtime同期
 * - テンプレート変更
 */
export function useShioriEditor(shioriId: string) {
  const { authFetch } = useAuthFetch()
  const { user } = useAuth()
  const toast = useToast()

  // コアデータ
  const shiori = ref<ShioriWithRole | null>(null)
  const loading = ref(true)
  const userRole = ref<CollaboratorRole | null>(null)

  // 派生状態
  const isOwner = computed(() => userRole.value === 'owner')
  const tmpl = computed(() => getTemplate(shiori.value?.template_id))

  // Realtime 同期
  const { onlineUsers, addPendingOp } = useRealtimeSync({
    shioriId,
    onShioriChange(payload) {
      if (!shiori.value) return
      shiori.value.title = payload.new.title
      shiori.value.start_date = payload.new.start_date
      shiori.value.end_date = payload.new.end_date
      shiori.value.area = payload.new.area
      shiori.value.is_public = payload.new.is_public
      shiori.value.invite_enabled = payload.new.invite_enabled
      shiori.value.invite_token = payload.new.invite_token
      shiori.value.template_id = payload.new.template_id
    },
    onDayChange(payload) {
      if (!shiori.value) return
      if (payload.eventType === 'INSERT') {
        const exists = shiori.value.days.some((d) => d.id === payload.new.id)
        if (!exists) {
          shiori.value.days.push({ ...payload.new, events: [] })
          shiori.value.days.sort((a, b) => a.sort_order - b.sort_order)
        }
      }
      else if (payload.eventType === 'UPDATE') {
        const idx = shiori.value.days.findIndex((d) => d.id === payload.new.id)
        if (idx >= 0) {
          shiori.value.days[idx] = { ...payload.new, events: shiori.value.days[idx]!.events }
        }
        shiori.value.days.sort((a, b) => a.sort_order - b.sort_order)
      }
      else if (payload.eventType === 'DELETE') {
        shiori.value.days = shiori.value.days.filter((d) => d.id !== payload.old.id)
      }
    },
    onEventChange(payload) {
      if (!shiori.value) return
      if (payload.eventType === 'INSERT') {
        const day = shiori.value.days.find((d) => d.id === payload.new.day_id)
        if (day) {
          const exists = day.events.some((e) => e.id === payload.new.id)
          if (!exists) {
            day.events.push(payload.new)
            day.events.sort((a, b) => a.sort_order - b.sort_order)
          }
        }
      }
      else if (payload.eventType === 'UPDATE') {
        for (const day of shiori.value.days) {
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
        const targetDay = shiori.value.days.find((d) => d.id === payload.new.day_id)
        if (targetDay && !targetDay.events.some((e) => e.id === payload.new.id)) {
          targetDay.events.push(payload.new)
        }
        for (const day of shiori.value.days) {
          day.events.sort((a, b) => a.sort_order - b.sort_order)
        }
      }
      else if (payload.eventType === 'DELETE') {
        for (const day of shiori.value.days) {
          day.events = day.events.filter((e) => e.id !== payload.old.id)
        }
      }
    },
  })

  // 自分以外のオンラインユーザー
  const otherOnlineUsers = computed(() =>
    onlineUsers.value.filter((u) => u.user_id !== user.value?.id),
  )

  /** しおりデータを取得 */
  async function fetchShiori() {
    loading.value = true
    try {
      const data = await authFetch<ShioriWithRole>(`/api/shiori/${shioriId}`)
      shiori.value = data
      userRole.value = data.userRole
    }
    catch {
      toast.add({ title: 'しおりの取得に失敗しました', color: 'error' })
      await navigateTo('/dashboard')
    }
    finally {
      loading.value = false
    }
  }

  /** タイトル保存 */
  async function saveTitle(title: string) {
    if (!shiori.value || !title.trim()) return
    try {
      addPendingOp(shioriId)
      await authFetch(`/api/shiori/${shioriId}`, {
        method: 'PUT',
        body: { title: title.trim() },
      })
      shiori.value.title = title.trim()
    }
    catch {
      toast.add({ title: 'タイトルの更新に失敗しました', color: 'error' })
    }
  }

  /** 日程を追加 */
  async function addDay() {
    if (!shiori.value) return
    const nextNumber = shiori.value.days.length + 1
    try {
      const day = await authFetch<Day>('/api/day', {
        method: 'POST',
        body: {
          shiori_id: shioriId,
          day_number: nextNumber,
        },
      })
      addPendingOp(day.id)
      shiori.value.days.push({ ...day, events: [] })
      toast.add({ title: `Day ${nextNumber} を追加しました`, color: 'success' })
    }
    catch {
      toast.add({ title: '日程の追加に失敗しました', color: 'error' })
    }
  }

  /** 日程を削除 */
  async function deleteDay(dayId: string, dayNumber: number) {
    if (!shiori.value) return
    addPendingOp(dayId)
    await authFetch(`/api/day/${dayId}`, { method: 'DELETE' })
    shiori.value.days = shiori.value.days.filter((d) => d.id !== dayId)
    toast.add({ title: `Day ${dayNumber} を削除しました`, color: 'success' })
  }

  /** イベント保存後のコールバック */
  function onEventSaved(savedEvent: Event) {
    if (!shiori.value) return
    addPendingOp(savedEvent.id)
    const day = shiori.value.days.find((d) => d.id === savedEvent.day_id)
    if (!day) return

    const eventIndex = day.events.findIndex((e) => e.id === savedEvent.id)
    if (eventIndex >= 0) {
      day.events[eventIndex] = savedEvent
    }
    else {
      day.events.push(savedEvent)
    }
  }

  /** イベントを削除 */
  async function deleteEvent(dayId: string, eventId: string) {
    if (!shiori.value) return
    addPendingOp(eventId)
    await authFetch(`/api/event/${eventId}`, { method: 'DELETE' })
    const day = shiori.value.days.find((d) => d.id === dayId)
    if (day) {
      day.events = day.events.filter((e) => e.id !== eventId)
    }
    toast.add({ title: 'イベントを削除しました', color: 'success' })
  }

  /** Day並び替え後のAPI保存 */
  async function reorderDays() {
    if (!shiori.value) return
    shiori.value.days.forEach((d, i) => {
      d.sort_order = i
      d.day_number = i + 1
      addPendingOp(d.id)
    })
    try {
      await authFetch('/api/day/reorder', {
        method: 'POST',
        body: {
          shiori_id: shioriId,
          order: shiori.value.days.map((d, i) => ({ id: d.id, sort_order: i })),
        },
      })
    }
    catch {
      toast.add({ title: '日程の並び替えに失敗しました', color: 'error' })
      await fetchShiori()
    }
  }

  /** イベント並び替え・Day間移動後のAPI保存 */
  async function reorderEvents() {
    if (!shiori.value) return
    const order: { id: string; day_id: string; sort_order: number }[] = []
    for (const day of shiori.value.days) {
      day.events.forEach((ev, i) => {
        ev.sort_order = i
        ev.day_id = day.id
        addPendingOp(ev.id)
        order.push({ id: ev.id, day_id: day.id, sort_order: i })
      })
    }
    try {
      await authFetch('/api/event/reorder', {
        method: 'POST',
        body: { shiori_id: shioriId, order },
      })
    }
    catch {
      toast.add({ title: 'イベントの並び替えに失敗しました', color: 'error' })
      await fetchShiori()
    }
  }

  /** しおりを削除 */
  async function deleteShiori() {
    await authFetch(`/api/shiori/${shioriId}`, { method: 'DELETE' })
    toast.add({ title: 'しおりを削除しました', color: 'success' })
    await navigateTo('/dashboard')
  }

  /** テンプレートを変更 */
  async function changeTemplate(templateId: string) {
    if (!shiori.value || shiori.value.template_id === templateId) return
    const prev = shiori.value.template_id
    shiori.value.template_id = templateId
    try {
      addPendingOp(shioriId)
      await authFetch(`/api/shiori/${shioriId}`, {
        method: 'PUT',
        body: { template_id: templateId },
      })
      toast.add({ title: 'テンプレートを変更しました', color: 'success' })
    }
    catch {
      shiori.value.template_id = prev
      toast.add({ title: 'テンプレートの変更に失敗しました', color: 'error' })
    }
  }

  onMounted(fetchShiori)

  return {
    // データ
    shiori,
    loading,
    userRole,
    // 派生状態
    isOwner,
    tmpl,
    otherOnlineUsers,
    // 操作
    fetchShiori,
    saveTitle,
    addDay,
    deleteDay,
    onEventSaved,
    deleteEvent,
    reorderDays,
    reorderEvents,
    deleteShiori,
    changeTemplate,
  }
}
