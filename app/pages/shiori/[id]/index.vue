<script setup lang="ts">
import type { ShioriWithRole, Day, Event, DayWithEvents, CollaboratorRole } from '~~/types/database'
import { getCategoryIcon, getCategoryLabel } from '~~/shared/category-icons'
import { getTemplate } from '~~/shared/templates'
import draggable from 'vuedraggable'

definePageMeta({
  middleware: 'auth',
  ssr: false,
})

const route = useRoute()
const { authFetch } = useAuthFetch()
const { user } = useAuth()
const toast = useToast()
const shioriId = route.params.id as string

const shiori = ref<ShioriWithRole | null>(null)
const loading = ref(true)
const userRole = ref<CollaboratorRole | null>(null)

// ロールに基づくUI制御
const isOwner = computed(() => userRole.value === 'owner')

// UI状態
const showChat = ref(false)
const chatWidth = ref(480) // デフォルト 480px
const isResizing = ref(false)
const CHAT_MIN_WIDTH = 320
const CHAT_MAX_WIDTH = 960

function startResize(e: PointerEvent) {
  isResizing.value = true
  const startX = e.clientX
  const startWidth = chatWidth.value

  function onMove(ev: PointerEvent) {
    // 左にドラッグ → 幅が広がる
    const delta = startX - ev.clientX
    chatWidth.value = Math.min(CHAT_MAX_WIDTH, Math.max(CHAT_MIN_WIDTH, startWidth + delta))
  }

  function onUp() {
    isResizing.value = false
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup', onUp)
  }

  document.addEventListener('pointermove', onMove)
  document.addEventListener('pointerup', onUp)
}

const editingTitle = ref(false)
const titleInput = ref('')
const showEventModal = ref(false)
const selectedDayId = ref('')
const selectedEvent = ref<Event | null>(null)
const showDeleteModal = ref(false)
const showShareModal = ref(false)
const showTemplateSelector = ref(false)
const deleting = ref(false)

// Day/イベント削除確認
const showDayDeleteModal = ref(false)
const deleteDayTarget = ref<{ id: string; dayNumber: number } | null>(null)
const showEventDeleteModal = ref(false)
const deleteEventTarget = ref<{ dayId: string; eventId: string; title: string } | null>(null)
const deletingItem = ref(false)

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

// Realtime 同期
const { onlineUsers, addPendingOp } = useRealtimeSync({
  shioriId,
  onShioriChange(payload) {
    if (!shiori.value) return
    // しおり本体の更新を反映（タイトル、日付、エリア等）
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
      // 新しい Day を追加（既に存在しない場合のみ）
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
      // day_id が変わった可能性があるので全 day を検索
      for (const day of shiori.value.days) {
        const idx = day.events.findIndex((e) => e.id === payload.new.id)
        if (idx >= 0) {
          if (day.id === payload.new.day_id) {
            day.events[idx] = payload.new
          }
          else {
            // day 間移動: 元の day から削除
            day.events.splice(idx, 1)
          }
        }
      }
      // 移動先の day にない場合は追加
      const targetDay = shiori.value.days.find((d) => d.id === payload.new.day_id)
      if (targetDay && !targetDay.events.some((e) => e.id === payload.new.id)) {
        targetDay.events.push(payload.new)
      }
      // ソート
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

/** タイトル編集開始 */
function startEditTitle() {
  if (!shiori.value) return
  titleInput.value = shiori.value.title
  editingTitle.value = true
}

/** タイトル保存 */
async function saveTitle() {
  if (!shiori.value || !titleInput.value.trim()) return
  try {
    addPendingOp(shioriId)
    await authFetch(`/api/shiori/${shioriId}`, {
      method: 'PUT',
      body: { title: titleInput.value.trim() },
    })
    shiori.value.title = titleInput.value.trim()
  }
  catch {
    toast.add({ title: 'タイトルの更新に失敗しました', color: 'error' })
  }
  finally {
    editingTitle.value = false
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

/** 日程削除の確認ダイアログを開く */
function confirmDeleteDay(dayId: string, dayNumber: number) {
  deleteDayTarget.value = { id: dayId, dayNumber }
  showDayDeleteModal.value = true
}

/** 日程を削除 */
async function deleteDay() {
  if (!shiori.value || !deleteDayTarget.value) return
  deletingItem.value = true
  const { id: dayId, dayNumber } = deleteDayTarget.value
  try {
    addPendingOp(dayId)
    await authFetch(`/api/day/${dayId}`, { method: 'DELETE' })
    shiori.value.days = shiori.value.days.filter((d) => d.id !== dayId)
    toast.add({ title: `Day ${dayNumber} を削除しました`, color: 'success' })
  }
  catch {
    toast.add({ title: '日程の削除に失敗しました', color: 'error' })
  }
  finally {
    deletingItem.value = false
    showDayDeleteModal.value = false
    deleteDayTarget.value = null
  }
}

/** イベント追加モーダルを開く */
function openAddEvent(dayId: string) {
  selectedDayId.value = dayId
  selectedEvent.value = null
  showEventModal.value = true
}

/** イベント編集モーダルを開く */
function openEditEvent(dayId: string, event: Event) {
  selectedDayId.value = dayId
  selectedEvent.value = event
  showEventModal.value = true
}

/** イベント保存後のコールバック */
function onEventSaved(savedEvent: Event) {
  if (!shiori.value) return
  addPendingOp(savedEvent.id)
  const day = shiori.value.days.find((d) => d.id === savedEvent.day_id)
  if (!day) return

  const eventIndex = day.events.findIndex((e) => e.id === savedEvent.id)

  if (eventIndex >= 0) {
    // 更新
    day.events[eventIndex] = savedEvent
  }
  else {
    // 新規追加
    day.events.push(savedEvent)
  }
}

/** イベント削除の確認ダイアログを開く */
function confirmDeleteEvent(dayId: string, eventId: string, title: string) {
  deleteEventTarget.value = { dayId, eventId, title }
  showEventDeleteModal.value = true
}

/** イベントを削除 */
async function deleteEvent() {
  if (!shiori.value || !deleteEventTarget.value) return
  deletingItem.value = true
  const { dayId, eventId } = deleteEventTarget.value
  try {
    addPendingOp(eventId)
    await authFetch(`/api/event/${eventId}`, { method: 'DELETE' })
    const day = shiori.value.days.find((d) => d.id === dayId)
    if (day) {
      day.events = day.events.filter((e) => e.id !== eventId)
    }
    toast.add({ title: 'イベントを削除しました', color: 'success' })
  }
  catch {
    toast.add({ title: 'イベントの削除に失敗しました', color: 'error' })
  }
  finally {
    deletingItem.value = false
    showEventDeleteModal.value = false
    deleteEventTarget.value = null
  }
}

/** Day並び替え後のAPI保存 */
async function onDayReorder() {
  if (!shiori.value) return
  // day_number を振り直す
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
async function onEventReorder() {
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
  deleting.value = true
  try {
    await authFetch(`/api/shiori/${shioriId}`, { method: 'DELETE' })
    toast.add({ title: 'しおりを削除しました', color: 'success' })
    await navigateTo('/dashboard')
  }
  catch {
    toast.add({ title: 'しおりの削除に失敗しました', color: 'error' })
  }
  finally {
    deleting.value = false
    showDeleteModal.value = false
  }
}

// テンプレートスタイル
const tmpl = computed(() => getTemplate(shiori.value?.template_id))

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
</script>

<template>
  <div v-if="loading" class="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
    <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-orange-500" />
  </div>

  <div v-else-if="shiori" class="flex h-full">
    <!-- メインエディタ -->
    <div class="flex-1 overflow-y-auto" :class="showChat ? '' : 'mx-auto max-w-5xl'">
      <!-- テンプレートヘッダーバナー -->
      <div class="relative overflow-hidden" :class="[tmpl.colors.headerBg, tmpl.colors.headerBgDark]">
        <div class="h-1.5 bg-gradient-to-r" :class="tmpl.colors.headerGradient" />
        <!-- 装飾アイコン -->
        <div v-if="tmpl.decorations.length > 0" class="relative h-12">
          <UIcon
            v-for="(deco, i) in tmpl.decorations"
            :key="i"
            :name="deco.icon"
            class="absolute opacity-40"
            :class="[deco.size, deco.position, tmpl.colors.decoColor, tmpl.colors.decoColorDark]"
          />
        </div>
      </div>

      <div class="px-4 py-6">
      <!-- ヘッダー -->
      <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex min-w-0 items-center gap-3">
          <UButton
            icon="i-lucide-arrow-left"
            variant="ghost"
            size="sm"
            to="/dashboard"
            class="shrink-0"
          />
          <!-- タイトル（クリックで編集） -->
          <div v-if="editingTitle" class="flex items-center gap-2">
            <UInput
              v-model="titleInput"
              autofocus
              class="text-xl font-bold"
              @keydown.enter="saveTitle"
              @keydown.escape="editingTitle = false"
              @blur="saveTitle"
            />
          </div>
          <h1
            v-else
            class="cursor-pointer truncate text-xl font-bold text-stone-900 hover:text-orange-500 dark:text-stone-50"
            @click="startEditTitle"
          >
            {{ shiori.title }}
            <UIcon name="i-lucide-pencil" class="ml-1 inline-block size-4 text-stone-400" />
          </h1>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <!-- オンラインユーザーアバター -->
          <div v-if="otherOnlineUsers.length > 0" class="flex -space-x-2">
            <div
              v-for="ou in otherOnlineUsers"
              :key="ou.user_id"
              class="relative flex size-7 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-orange-100 dark:border-stone-800 dark:bg-orange-900/30"
              :title="ou.display_name || 'ゲスト'"
            >
              <img
                v-if="ou.avatar_url"
                :src="ou.avatar_url"
                :alt="ou.display_name || ''"
                class="size-full object-cover"
              >
              <UIcon v-else name="i-lucide-user" class="size-3.5 text-orange-500" />
              <!-- オンラインインジケーター -->
              <span class="absolute bottom-0 right-0 size-2 rounded-full bg-green-500 ring-1 ring-white dark:ring-stone-800" />
            </div>
          </div>

          <UButton
            icon="i-lucide-sparkles"
            variant="soft"
            size="sm"
            :class="showChat ? 'ring-2 ring-orange-500' : ''"
            @click="showChat = !showChat"
          >
            <span class="hidden sm:inline">AI相談</span>
          </UButton>
          <!-- テンプレート切替ボタン（オーナーのみ） -->
          <UButton
            v-if="isOwner"
            icon="i-lucide-palette"
            variant="ghost"
            size="sm"
            :class="showTemplateSelector ? 'ring-2 ring-orange-500' : ''"
            @click="showTemplateSelector = !showTemplateSelector"
          >
            <span class="hidden sm:inline">テーマ</span>
          </UButton>
          <UButton
            icon="i-lucide-share-2"
            variant="ghost"
            size="sm"
            @click="showShareModal = true"
          >
            <span class="hidden sm:inline">共有</span>
          </UButton>
          <!-- 削除ボタン（オーナーのみ） -->
          <UButton
            v-if="isOwner"
            icon="i-lucide-trash-2"
            variant="ghost"
            size="sm"
            class="text-stone-400 hover:!text-red-500"
            @click="showDeleteModal = true"
          />
        </div>
      </div>

      <!-- しおり情報 -->
      <div v-if="shiori.area || shiori.start_date" class="mb-6 flex flex-wrap gap-3 text-sm text-stone-500">
        <span v-if="shiori.area" class="flex items-center gap-1">
          <UIcon name="i-lucide-map-pin" class="size-4" />
          {{ shiori.area }}
        </span>
        <span v-if="shiori.start_date" class="flex items-center gap-1">
          <UIcon name="i-lucide-calendar" class="size-4" />
          {{ shiori.start_date }}
          <template v-if="shiori.end_date">〜 {{ shiori.end_date }}</template>
        </span>
      </div>

      <!-- テンプレート選択（オーナーのみ） -->
      <div v-if="isOwner && showTemplateSelector" class="mb-6 rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-900">
        <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
          <UIcon name="i-lucide-palette" class="size-4" />
          デザインテンプレート
        </h3>
        <ShioriTemplateSelector
          :model-value="shiori.template_id"
          @update:model-value="changeTemplate"
        />
      </div>

      <!-- 空の状態 -->
      <div v-if="shiori.days.length === 0" class="py-16 text-center">
        <div class="mb-4 text-5xl">
          🗓️
        </div>
        <h3 class="mb-2 text-lg font-semibold text-stone-900 dark:text-stone-50">
          まだ予定がありません
        </h3>
        <p class="mb-6 text-stone-500">
          AIに相談してプランを作るか、手動で日程を追加しましょう
        </p>
        <div class="flex items-center justify-center gap-3">
          <UButton icon="i-lucide-sparkles" @click="showChat = true">
            AIでプランを作る
          </UButton>
          <UButton icon="i-lucide-plus" variant="outline" @click="addDay">
            日程を追加
          </UButton>
        </div>
      </div>

      <!-- 日程リスト -->
      <div v-else class="space-y-6">
        <draggable
          v-model="shiori.days"
          item-key="id"
          handle=".day-drag-handle"
          animation="200"
          ghost-class="opacity-30"
          @end="onDayReorder"
        >
          <template #item="{ element: day }: { element: DayWithEvents }">
            <div class="mb-6">
              <!-- 日程ヘッダー -->
              <div class="mb-3 flex items-center justify-between">
                <h2 class="flex items-center gap-2 text-sm font-semibold" :class="tmpl.colors.dayHeader">
                  <span class="day-drag-handle -m-1.5 flex cursor-grab items-center justify-center p-1.5 active:cursor-grabbing">
                    <UIcon
                      name="i-lucide-grip-vertical"
                      class="size-4 text-stone-300"
                      :class="tmpl.colors.dragHandleHover"
                    />
                  </span>
                  <UIcon name="i-lucide-calendar-days" class="size-4" />
                  Day {{ day.day_number }}
                  <span v-if="day.date" class="text-stone-400">{{ day.date }}</span>
                </h2>
                <div class="flex items-center gap-1">
                  <UButton
                    icon="i-lucide-plus"
                    variant="ghost"
                    size="xs"
                    @click="openAddEvent(day.id)"
                  />
                  <UButton
                    icon="i-lucide-trash-2"
                    variant="ghost"
                    size="xs"
                    class="text-stone-400 hover:text-red-500"
                    @click="confirmDeleteDay(day.id, day.day_number)"
                  />
                </div>
              </div>

              <!-- イベントリスト（ドラッグ&ドロップ対応、Day間移動可） -->
              <draggable
                v-model="day.events"
                item-key="id"
                group="events"
                handle=".event-drag-handle"
                animation="200"
                ghost-class="opacity-30"
                class="min-h-[2rem] space-y-2"
                @end="onEventReorder"
              >
                <template #item="{ element: ev }: { element: Event }">
                  <div
                    class="group relative flex items-start gap-3 overflow-hidden rounded-xl border border-l-[3px] border-stone-200 bg-white p-3 transition-all dark:border-stone-700 dark:bg-stone-900"
                    :class="[tmpl.colors.cardLeftBorder, tmpl.colors.cardBorderHover]"
                  >
                    <!-- カード内装飾アイコン（デコレーション配列をローテーション） -->
                    <UIcon
                      v-if="tmpl.decorations.length > 0"
                      :name="tmpl.decorations[ev.sort_order % tmpl.decorations.length]!.icon"
                      class="pointer-events-none absolute -bottom-3 -right-3 size-20 opacity-[0.08]"
                      :class="[tmpl.colors.cardDecoColor, tmpl.colors.cardDecoColorDark]"
                    />

                    <!-- ドラッグハンドル -->
                    <div class="flex shrink-0 flex-col items-center gap-1">
                      <span class="event-drag-handle -m-1 flex cursor-grab items-center justify-center p-2 active:cursor-grabbing">
                        <UIcon
                          name="i-lucide-grip-vertical"
                          class="size-4 text-stone-300"
                          :class="tmpl.colors.dragHandleHover"
                        />
                      </span>
                      <!-- カテゴリアイコン -->
                      <div class="flex size-10 items-center justify-center rounded-lg" :class="[tmpl.colors.eventIconBg, tmpl.colors.accentBgDark]">
                        <UIcon :name="getCategoryIcon(ev.category)" class="size-5" :class="tmpl.colors.eventIconText" />
                      </div>
                    </div>

                    <!-- イベント情報 -->
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2">
                        <span v-if="ev.start_time" class="text-xs font-medium text-stone-400">
                          {{ ev.start_time.slice(0, 5) }}
                          <template v-if="ev.end_time"> - {{ ev.end_time.slice(0, 5) }}</template>
                        </span>
                        <span
                          class="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium"
                          :class="[tmpl.colors.badgeText, tmpl.colors.badgeBg]"
                        >
                          {{ getCategoryLabel(ev.category) }}
                        </span>
                      </div>
                      <p class="mt-0.5 font-medium text-stone-900 dark:text-stone-50">
                        {{ ev.title }}
                      </p>
                      <p v-if="ev.address" class="mt-0.5 flex items-center gap-1 text-xs text-stone-400">
                        <UIcon name="i-lucide-map-pin" class="size-3" />
                        {{ ev.address }}
                      </p>
                      <p v-if="ev.memo" class="mt-1 text-xs text-stone-500">
                        {{ ev.memo }}
                      </p>
                      <!-- URLリンク -->
                      <a
                        v-if="ev.url"
                        :href="ev.url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="mt-1 inline-flex items-center gap-1 text-xs hover:underline"
                        :class="[tmpl.colors.link, tmpl.colors.linkHover]"
                      >
                        <UIcon name="i-lucide-external-link" class="size-3" />
                        {{ ev.url.replace(/^https?:\/\//, '').split('/')[0] }}
                      </a>
                    </div>

                    <!-- アクションボタン -->
                    <div class="flex shrink-0 gap-1 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                      <UButton
                        icon="i-lucide-pencil"
                        variant="ghost"
                        size="xs"
                        @click="openEditEvent(day.id, ev)"
                      />
                      <UButton
                        icon="i-lucide-trash-2"
                        variant="ghost"
                        size="xs"
                        class="text-stone-400 hover:text-red-500"
                        @click="confirmDeleteEvent(day.id, ev.id, ev.title)"
                      />
                    </div>
                  </div>
                </template>
              </draggable>

              <!-- イベント追加ボタン -->
              <button
                class="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-200 p-3 text-sm text-stone-400 transition-colors dark:border-stone-700"
                :class="[tmpl.colors.addBtnBorderHover, tmpl.colors.addBtnTextHover, tmpl.colors.addBtnBorderHoverDark]"
                @click="openAddEvent(day.id)"
              >
                <UIcon name="i-lucide-plus" class="size-4" />
                イベントを追加
              </button>
            </div>
          </template>
        </draggable>

        <!-- 日程追加ボタン -->
        <button
          class="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-300 p-4 text-stone-500 transition-colors dark:border-stone-600"
          :class="[tmpl.colors.addBtnBorderHover, tmpl.colors.addBtnTextHover, tmpl.colors.addBtnBorderHoverDark]"
          @click="addDay"
        >
          <UIcon name="i-lucide-plus-circle" class="size-5" />
          日程を追加
        </button>
      </div>
    </div><!-- /px-4 py-6 -->
    </div><!-- /flex-1 -->

    <!-- モバイル: チャットパネル フルスクリーンオーバーレイ -->
    <div v-if="showChat" class="fixed inset-0 z-50 bg-white dark:bg-stone-900 md:hidden">
      <ChatPanel :shiori-id="shioriId" @close="showChat = false" @plan-applied="fetchShiori" />
    </div>

    <!-- デスクトップ: リサイズハンドル + AIチャットパネル サイドバー -->
    <template v-if="showChat">
      <!-- リサイズハンドル -->
      <div
        class="group relative hidden w-1 shrink-0 cursor-col-resize bg-stone-200 transition-colors hover:bg-orange-400 active:bg-orange-500 md:block dark:bg-stone-700 dark:hover:bg-orange-500"
        @pointerdown.prevent="startResize"
      >
        <!-- ドラッグインジケーター（中央の点々） -->
        <div class="absolute inset-y-0 -left-1 -right-1" />
        <div class="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
          <div class="flex flex-col gap-1">
            <span class="block size-1 rounded-full bg-orange-500" />
            <span class="block size-1 rounded-full bg-orange-500" />
            <span class="block size-1 rounded-full bg-orange-500" />
          </div>
        </div>
      </div>

      <!-- チャットパネル -->
      <div
        class="hidden shrink-0 bg-white md:block dark:bg-stone-900"
        :style="{ width: `${chatWidth}px` }"
      >
        <ChatPanel :shiori-id="shioriId" @close="showChat = false" @plan-applied="fetchShiori" />
      </div>
    </template>

    <!-- リサイズ中のオーバーレイ（iframe等のポインターイベント遮断防止） -->
    <div v-if="isResizing" class="fixed inset-0 z-50 hidden cursor-col-resize md:block" />
  </div>

  <!-- イベント追加・編集モーダル -->
  <ShioriEventFormModal
    v-model="showEventModal"
    :day-id="selectedDayId"
    :event="selectedEvent"
    @saved="onEventSaved"
  />

  <!-- 共有設定モーダル -->
  <ShioriShareModal
    v-if="shiori"
    v-model="showShareModal"
    :shiori="shiori"
    :is-owner="isOwner"
    @updated="(v) => { if (shiori) shiori.is_public = v }"
  />

  <!-- しおり削除確認モーダル（オーナーのみ） -->
  <UModal
    v-if="isOwner"
    v-model:open="showDeleteModal"
    title="しおりを削除"
    :description="`「${shiori?.title}」を削除しますか？`"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <p class="text-xs text-stone-400">
        日程・イベント・チャット履歴もすべて削除されます。この操作は取り消せません。
      </p>
    </template>
    <template #footer="{ close }">
      <UButton variant="ghost" @click="close">
        キャンセル
      </UButton>
      <UButton color="error" :loading="deleting" @click="deleteShiori">
        削除する
      </UButton>
    </template>
  </UModal>

  <!-- 日程削除確認モーダル -->
  <UModal
    v-model:open="showDayDeleteModal"
    title="日程を削除"
    :description="`「Day ${deleteDayTarget?.dayNumber}」を削除しますか？`"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <p class="text-xs text-stone-400">
        この日程に含まれるイベントもすべて削除されます。
      </p>
    </template>
    <template #footer="{ close }">
      <UButton variant="ghost" @click="close">
        キャンセル
      </UButton>
      <UButton color="error" :loading="deletingItem" @click="deleteDay">
        削除する
      </UButton>
    </template>
  </UModal>

  <!-- イベント削除確認モーダル -->
  <UModal
    v-model:open="showEventDeleteModal"
    title="イベントを削除"
    :description="`「${deleteEventTarget?.title}」を削除しますか？`"
    :ui="{ footer: 'justify-end' }"
  >
    <template #footer="{ close }">
      <UButton variant="ghost" @click="close">
        キャンセル
      </UButton>
      <UButton color="error" :loading="deletingItem" @click="deleteEvent">
        削除する
      </UButton>
    </template>
  </UModal>
</template>
