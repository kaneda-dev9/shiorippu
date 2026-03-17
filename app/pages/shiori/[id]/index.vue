<script setup lang="ts">
import type { Event, DayWithEvents } from '~~/types/database'
import { VueDraggable } from 'vue-draggable-plus'

definePageMeta({
  middleware: 'auth',
  ssr: false,
})

const route = useRoute()
const toast = useToast()
const shioriId = route.params.id as string

// Googleカレンダー接続完了時のtoast表示
onMounted(() => {
  if (route.query.calendar_connected === 'true') {
    toast.add({ title: 'Googleカレンダーに接続しました', color: 'success' })
    // クエリパラメータを除去
    const { calendar_connected: _, ...rest } = route.query
    navigateTo({ query: rest }, { replace: true })
  }
})

// データ操作は composable に集約
const {
  shiori,
  loading,
  isOwner,
  tmpl,
  otherOnlineUsers,
  fetchShiori,
  saveTitle,
  saveDates,
  addDay,
  deleteDay,
  onEventSaved,
  deleteEvent,
  reorderEvents,
  deleteShiori,
  changeTemplate,
  changeCoverImage,
} = useShioriEditor(shioriId)

// --- UI状態 ---
const showChat = ref<boolean>(false)
const chatWidth = ref<number>(480)
const isResizing = ref<boolean>(false)
const CHAT_MIN_WIDTH = 320
const CHAT_MAX_WIDTH = 960

function startResize(e: PointerEvent) {
  isResizing.value = true
  const startX = e.clientX
  const startWidth = chatWidth.value

  function onMove(ev: PointerEvent) {
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

const editingTitle = ref<boolean>(false)
const titleInput = ref<string>('')
const showEventModal = ref<boolean>(false)
const selectedDayId = ref<string>('')
const selectedEvent = ref<Event | null>(null)
const showDeleteModal = ref<boolean>(false)
const showShareModal = ref<boolean>(false)
const showTemplateSelector = ref<boolean>(false)
const processing = ref<boolean>(false)

// タブナビゲーション
const activeDay = ref<string>('')

const dayTabItems = computed(() => {
  if (!shiori.value) return []
  return [...shiori.value.days]
    .sort((a, b) => a.day_number - b.day_number)
    .map((d) => ({
      label: `Day ${d.day_number}`,
      value: d.id,
    }))
})

// テンプレートに応じたアクティブタブの色
const tabActiveClass = computed<string>(() => {
  const map: Record<string, string> = {
    simple: 'bg-stone-700 dark:bg-stone-300 dark:text-stone-900',
    pop: 'bg-orange-500 dark:bg-orange-500',
    wafuu: 'bg-amber-600 dark:bg-amber-500',
    resort: 'bg-cyan-500 dark:bg-cyan-500',
    nature: 'bg-green-600 dark:bg-green-500',
  }
  return map[tmpl.value.id] || map.simple!
})

const currentDay = computed<DayWithEvents | undefined>(() => {
  if (!shiori.value) return undefined
  return shiori.value.days.find((d) => d.id === activeDay.value)
})

// activeDay が無効な場合、先頭の Day にフォールバック
watch(() => shiori.value?.days, (days) => {
  if (!days || days.length === 0) {
    activeDay.value = ''
    return
  }
  const valid = days.some((d) => d.id === activeDay.value)
  if (!valid) {
    activeDay.value = days[0]!.id
  }
}, { immediate: true, deep: true })

// Day/イベント削除確認
const showDayDeleteModal = ref<boolean>(false)
const deleteDayTarget = ref<{ id: string; dayNumber: number } | null>(null)
const showEventDeleteModal = ref<boolean>(false)
const deleteEventTarget = ref<{ dayId: string; eventId: string; title: string } | null>(null)

// --- UIイベントハンドラ ---

/** タイトル編集開始 */
function startEditTitle() {
  if (!shiori.value) return
  titleInput.value = shiori.value.title
  editingTitle.value = true
}

/** タイトル保存 */
async function handleSaveTitle() {
  processing.value = true
  try {
    await saveTitle(titleInput.value)
    editingTitle.value = false
  }
  finally {
    processing.value = false
  }
}

// 日程の v-model ブリッジ（range では start/end が同時更新されるため debounce で1回にまとめる）
const shioriStartDate = ref<string | null>(null)
const shioriEndDate = ref<string | null>(null)

// shiori データからの同期
watch(() => shiori.value?.start_date, (val) => { shioriStartDate.value = val ?? null }, { immediate: true })
watch(() => shiori.value?.end_date, (val) => { shioriEndDate.value = val ?? null }, { immediate: true })

// ピッカー変更 → API保存（同一tickの変更をまとめる）
let saveDatesTimer: ReturnType<typeof setTimeout> | null = null
watch([shioriStartDate, shioriEndDate], ([start, end]) => {
  if (!shiori.value) return
  // shiori側の値と同じなら保存不要
  if (start === (shiori.value.start_date ?? null) && end === (shiori.value.end_date ?? null)) return
  if (saveDatesTimer) clearTimeout(saveDatesTimer)
  saveDatesTimer = setTimeout(() => saveDates(start, end), 0)
})

/** 日程削除の確認ダイアログを開く */
function confirmDeleteDay(dayId: string, dayNumber: number) {
  deleteDayTarget.value = { id: dayId, dayNumber }
  showDayDeleteModal.value = true
}

/** 日程を削除（UI状態のラッパー） */
async function handleDeleteDay() {
  if (!deleteDayTarget.value || !shiori.value) return
  processing.value = true

  // 削除前に切り替え先を計算
  const idx = shiori.value.days.findIndex((d) => d.id === deleteDayTarget.value!.id)
  const days = shiori.value.days
  const nextActiveId = idx > 0
    ? days[idx - 1]!.id
    : days.length > 1
      ? days[1]!.id
      : ''

  try {
    await deleteDay(deleteDayTarget.value.id, deleteDayTarget.value.dayNumber)
    activeDay.value = nextActiveId
  }
  catch {
    toast.add({ title: '日程の削除に失敗しました', color: 'error' })
  }
  finally {
    processing.value = false
    showDayDeleteModal.value = false
    deleteDayTarget.value = null
  }
}

/** 日程を追加してタブをアクティブにする */
async function handleAddDay() {
  processing.value = true
  try {
    const newDayId = await addDay()
    if (newDayId) {
      activeDay.value = newDayId
    }
  }
  finally {
    processing.value = false
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

/** イベント削除の確認ダイアログを開く */
function confirmDeleteEvent(dayId: string, eventId: string, title: string) {
  deleteEventTarget.value = { dayId, eventId, title }
  showEventDeleteModal.value = true
}

/** イベントを削除（UI状態のラッパー） */
async function handleDeleteEvent() {
  if (!deleteEventTarget.value) return
  processing.value = true
  try {
    await deleteEvent(deleteEventTarget.value.dayId, deleteEventTarget.value.eventId)
  }
  catch {
    toast.add({ title: 'イベントの削除に失敗しました', color: 'error' })
  }
  finally {
    processing.value = false
    showEventDeleteModal.value = false
    deleteEventTarget.value = null
  }
}

/** しおりを削除（UI状態のラッパー） */
async function handleDeleteShiori() {
  processing.value = true
  try {
    await deleteShiori()
  }
  catch {
    toast.add({ title: 'しおりの削除に失敗しました', color: 'error' })
  }
  finally {
    processing.value = false
    showDeleteModal.value = false
  }
}
</script>

<template>
  <div class="h-full">
    <div v-if="loading" class="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
      <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-orange-500" />
    </div>

    <div v-else-if="shiori" class="flex h-full">
      <!-- メインエディタ -->
      <div class="flex-1 overflow-y-auto" :class="showChat ? '' : 'mx-auto max-w-5xl'">
        <!-- カバー画像ヒーロー -->
        <div class="relative h-48 overflow-hidden sm:h-56">
          <img
            v-if="shiori.cover_image_url"
            :src="shiori.cover_image_url"
            :alt="shiori.title"
            class="size-full object-cover"
          >
          <div
            v-else
            class="size-full bg-gradient-to-r"
            :class="tmpl.colors.headerGradient"
          />
          <!-- ダークオーバーレイ -->
          <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-black/10" />
          <!-- カバー画像変更ボタン（オーナーのみ） -->
          <UButton
            v-if="isOwner"
            icon="i-lucide-image"
            variant="soft"
            size="xs"
            class="absolute bottom-3 right-3 bg-black/30 text-white backdrop-blur-sm hover:bg-black/50"
            @click="showTemplateSelector = !showTemplateSelector"
          >
            カバー変更
          </UButton>
        </div>

        <div class="px-4 py-6">
        <!-- ヘッダー -->
        <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex min-w-0 items-center gap-3">
            <UButton
              icon="i-lucide-arrow-left"
              variant="ghost"
              size="sm"
              aria-label="ダッシュボードに戻る"
              to="/dashboard"
              class="shrink-0"
            />
            <!-- タイトル（クリックで編集） -->
            <div v-if="editingTitle" class="flex items-center gap-2">
              <UInput
                v-model="titleInput"
                autofocus
                :loading="processing"
                class="text-xl font-bold"
                @keydown.enter="handleSaveTitle"
                @keydown.escape="editingTitle = false"
                @blur="handleSaveTitle"
              />
            </div>
            <h1
              v-else
              tabindex="0"
              role="button"
              class="cursor-pointer truncate text-xl font-bold text-stone-900 hover:text-orange-500 focus-visible:outline-2 focus-visible:outline-orange-500 dark:text-stone-50"
              @click="startEditTitle"
              @keydown.enter="startEditTitle"
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
                  width="28"
                  height="28"
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
              AI相談
            </UButton>
            <UButton
              icon="i-lucide-map"
              variant="ghost"
              size="sm"
              :to="`/shiori/${shioriId}/map`"
            >
              マップ
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
              テーマ
            </UButton>
            <SectionShioriCalendarExportButton
              :shiori-id="shioriId"
              :start-date="shiori.start_date"
              variant="ghost"
              size="sm"
            />
            <SectionShioriPdfExportButton
              v-if="shiori"
              :shiori="shiori"
              variant="ghost"
              size="sm"
            />
            <UButton
              icon="i-lucide-share-2"
              variant="ghost"
              size="sm"
              @click="showShareModal = true"
            >
              共有
            </UButton>
            <!-- 削除ボタン（オーナーのみ） -->
            <UButton
              v-if="isOwner"
              icon="i-lucide-trash-2"
              variant="ghost"
              size="sm"
              class="text-stone-400 hover:!text-red-500"
              @click="showDeleteModal = true"
            >
              削除
            </UButton>
          </div>
        </div>

        <!-- しおり情報 -->
        <div class="mb-6 flex flex-wrap items-center gap-3 text-sm text-stone-500">
          <span v-if="shiori.area" class="flex items-center gap-1">
            <UIcon name="i-lucide-map-pin" class="size-4" />
            {{ shiori.area }}
          </span>

          <!-- 日程ピッカー -->
          <AtomsDatePicker
            v-model:start-date="shioriStartDate"
            v-model:end-date="shioriEndDate"
            range
            clearable
            :maximum-days="shiori.days.length || undefined"
            placeholder="日程を設定"
          />
        </div>

        <!-- テーマ設定（オーナーのみ） -->
        <div v-if="isOwner && showTemplateSelector" class="mb-6 space-y-5 rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-900">
          <!-- カラーテーマ -->
          <div>
            <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
              <UIcon name="i-lucide-palette" class="size-4" />
              カラーテーマ
            </h3>
            <ContainersShioriTemplateSelector
              :selected="shiori.template_id"
              @update:selected="changeTemplate"
            />
          </div>
          <!-- カバー画像 -->
          <div>
            <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
              <UIcon name="i-lucide-image" class="size-4" />
              カバー画像
            </h3>
            <ContainersShioriCoverImagePicker
              :selected="shiori.cover_image_url"
              @update:selected="changeCoverImage"
            />
          </div>
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
            <UButton icon="i-lucide-plus" variant="outline" :loading="processing" @click="handleAddDay">
              日程を追加
            </UButton>
          </div>
        </div>

        <!-- 日程タブ -->
        <div v-else>
          <!-- Day タブバー -->
          <SectionShioriDayTabBar
            v-model:active-day="activeDay"
            :items="dayTabItems"
            :active-class="tabActiveClass"
            :show-delete="!!currentDay"
            :adding="processing"
            @add-day="handleAddDay"
            @delete-day="currentDay && confirmDeleteDay(currentDay.id, currentDay.day_number)"
          />

          <!-- 選択中の Day のイベントリスト -->
          <div v-if="currentDay" class="mt-4">
            <!-- 日程ヘッダー -->
            <div class="mb-3 flex items-center justify-between">
              <h2 class="flex items-center gap-2 text-sm font-semibold" :class="tmpl.colors.dayHeader">
                <UIcon name="i-lucide-calendar-days" class="size-4" />
                Day {{ currentDay.day_number }}
                <span v-if="currentDay.date" class="text-stone-400">{{ currentDay.date }}</span>
              </h2>
              <UButton
                icon="i-lucide-plus"
                variant="ghost"
                size="xs"
                aria-label="イベントを追加"
                @click="openAddEvent(currentDay.id)"
              />
            </div>

            <!-- イベントリスト（同一Day内のドラッグ&ドロップ） -->
            <VueDraggable
              v-model="currentDay.events"
              handle=".event-drag-handle"
              :animation="200"
              ghost-class="opacity-30"
              class="min-h-[2rem] space-y-3"
              @end="reorderEvents"
            >
              <SectionShioriEventCard
                v-for="event in currentDay.events"
                :key="event.id"
                :event="event"
                :tmpl="tmpl"
                @edit="openEditEvent(currentDay!.id, event)"
                @delete="confirmDeleteEvent(currentDay!.id, event.id, event.title)"
              />
            </VueDraggable>

            <!-- イベント追加ボタン -->
            <UButton
              icon="i-lucide-plus"
              variant="outline"
              block
              class="mt-2 rounded-xl border-2 border-dashed"
              :class="[tmpl.colors.addBtnBorderHover, tmpl.colors.addBtnTextHover, tmpl.colors.addBtnBorderHoverDark]"
              @click="openAddEvent(currentDay.id)"
            >
              イベントを追加
            </UButton>
          </div>

          <!-- 日程追加ボタン -->
          <UButton
            icon="i-lucide-plus-circle"
            variant="outline"
            size="lg"
            block
            :loading="processing"
            class="mt-6 rounded-xl border-2 border-dashed"
            :class="[tmpl.colors.addBtnBorderHover, tmpl.colors.addBtnTextHover, tmpl.colors.addBtnBorderHoverDark]"
            @click="handleAddDay"
          >
            日程を追加
          </UButton>
        </div>
      </div><!-- /px-4 py-6 -->
      </div><!-- /flex-1 -->

      <!-- モバイル: チャットパネル フルスクリーンオーバーレイ -->
      <div v-if="showChat" class="fixed inset-0 z-50 bg-white dark:bg-stone-900 md:hidden">
        <SectionChatPanel :shiori-id="shioriId" @close="showChat = false" @plan-applied="fetchShiori" />
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
          <SectionChatPanel :shiori-id="shioriId" @close="showChat = false" @plan-applied="fetchShiori" />
        </div>
      </template>

      <!-- リサイズ中のオーバーレイ（iframe等のポインターイベント遮断防止） -->
      <div v-if="isResizing" class="fixed inset-0 z-50 hidden cursor-col-resize md:block" />
    </div>

    <!-- イベント追加・編集モーダル -->
    <SectionShioriEventFormModal
      v-model:show="showEventModal"
      :day-id="selectedDayId"
      :event="selectedEvent"
      :days="shiori?.days || []"
      @saved="onEventSaved"
    />

    <!-- 共有設定モーダル -->
    <SectionShioriShareModal
      v-if="shiori"
      v-model:show="showShareModal"
      :shiori="shiori"
      :is-owner="isOwner"
      @updated="(v) => { if (shiori) shiori.is_public = v }"
    />

    <!-- しおり削除確認モーダル（オーナーのみ） -->
    <AtomsConfirmModal
      v-if="isOwner"
      v-model:show="showDeleteModal"
      title="しおりを削除"
      :description="`「${shiori?.title}」を削除しますか？`"
      :loading="processing"
      @confirm="handleDeleteShiori"
    >
      <template #body>
        <p class="text-xs text-stone-400">
          日程・イベント・チャット履歴もすべて削除されます。この操作は取り消せません。
        </p>
      </template>
    </AtomsConfirmModal>

    <!-- 日程削除確認モーダル -->
    <AtomsConfirmModal
      v-model:show="showDayDeleteModal"
      title="日程を削除"
      :description="`「Day ${deleteDayTarget?.dayNumber}」を削除しますか？`"
      :loading="processing"
      @confirm="handleDeleteDay"
    >
      <template #body>
        <p class="text-xs text-stone-400">
          この日程に含まれるイベントもすべて削除されます。
        </p>
      </template>
    </AtomsConfirmModal>

    <!-- イベント削除確認モーダル -->
    <AtomsConfirmModal
      v-model:show="showEventDeleteModal"
      title="イベントを削除"
      :description="`「${deleteEventTarget?.title}」を削除しますか？`"
      :loading="processing"
      @confirm="handleDeleteEvent"
    />
  </div>
</template>
