<script setup lang="ts">
import type { Event, DayWithEvents } from '~~/types/database'
import { getCategoryIcon, getCategoryLabel } from '~~/shared/category-icons'
import { VueDraggable } from 'vue-draggable-plus'

definePageMeta({
  middleware: 'auth',
  ssr: false,
})

const route = useRoute()
const toast = useToast()
const shioriId = route.params.id as string

// データ操作は composable に集約
const {
  shiori,
  loading,
  isOwner,
  tmpl,
  otherOnlineUsers,
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
const deleting = ref<boolean>(false)

// Day/イベント削除確認
const showDayDeleteModal = ref<boolean>(false)
const deleteDayTarget = ref<{ id: string; dayNumber: number } | null>(null)
const showEventDeleteModal = ref<boolean>(false)
const deleteEventTarget = ref<{ dayId: string; eventId: string; title: string } | null>(null)
const deletingItem = ref<boolean>(false)

// --- UIイベントハンドラ ---

/** タイトル編集開始 */
function startEditTitle() {
  if (!shiori.value) return
  titleInput.value = shiori.value.title
  editingTitle.value = true
}

/** タイトル保存 */
async function handleSaveTitle() {
  await saveTitle(titleInput.value)
  editingTitle.value = false
}

/** 日程削除の確認ダイアログを開く */
function confirmDeleteDay(dayId: string, dayNumber: number) {
  deleteDayTarget.value = { id: dayId, dayNumber }
  showDayDeleteModal.value = true
}

/** 日程を削除（UI状態のラッパー） */
async function handleDeleteDay() {
  if (!deleteDayTarget.value) return
  deletingItem.value = true
  try {
    await deleteDay(deleteDayTarget.value.id, deleteDayTarget.value.dayNumber)
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

/** イベント削除の確認ダイアログを開く */
function confirmDeleteEvent(dayId: string, eventId: string, title: string) {
  deleteEventTarget.value = { dayId, eventId, title }
  showEventDeleteModal.value = true
}

/** イベントを削除（UI状態のラッパー） */
async function handleDeleteEvent() {
  if (!deleteEventTarget.value) return
  deletingItem.value = true
  try {
    await deleteEvent(deleteEventTarget.value.dayId, deleteEventTarget.value.eventId)
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

/** しおりを削除（UI状態のラッパー） */
async function handleDeleteShiori() {
  deleting.value = true
  try {
    await deleteShiori()
  }
  catch {
    toast.add({ title: 'しおりの削除に失敗しました', color: 'error' })
  }
  finally {
    deleting.value = false
    showDeleteModal.value = false
  }
}
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
        <div v-if="tmpl.decorations.length > 0" class="relative h-12" aria-hidden="true">
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
            aria-label="ダッシュボードに戻る"
            to="/dashboard"
            class="shrink-0"
          />
          <!-- タイトル（クリックで編集） -->
          <div v-if="editingTitle" class="flex items-center gap-2">
            <UInput
              v-model="titleInput"
              autofocus
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
            <span class="hidden sm:inline">AI相談</span>
          </UButton>
          <UButton
            icon="i-lucide-map"
            variant="ghost"
            size="sm"
            :to="`/shiori/${shioriId}/map`"
          >
            <span class="hidden sm:inline">マップ</span>
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
          <ShioriPdfExportButton
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
            <span class="hidden sm:inline">共有</span>
          </UButton>
          <!-- 削除ボタン（オーナーのみ） -->
          <UButton
            v-if="isOwner"
            icon="i-lucide-trash-2"
            variant="ghost"
            size="sm"
            aria-label="しおりを削除"
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
          :selected="shiori.template_id"
          @update:selected="changeTemplate"
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
        <VueDraggable
          v-model="shiori.days"
          handle=".day-drag-handle"
          :animation="200"
          ghostClass="opacity-30"
          @end="reorderDays"
        >
          <div v-for="day in shiori.days" :key="day.id" class="mb-6">
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
                    aria-label="イベントを追加"
                    @click="openAddEvent(day.id)"
                  />
                  <UButton
                    icon="i-lucide-trash-2"
                    variant="ghost"
                    size="xs"
                    aria-label="日程を削除"
                    class="text-stone-400 hover:text-red-500"
                    @click="confirmDeleteDay(day.id, day.day_number)"
                  />
                </div>
              </div>

              <!-- イベントリスト（ドラッグ&ドロップ対応、Day間移動可） -->
              <VueDraggable
                v-model="day.events"
                group="events"
                handle=".event-drag-handle"
                :animation="200"
                ghostClass="opacity-30"
                class="min-h-[2rem] space-y-2"
                @end="reorderEvents"
              >
                <div
                  v-for="ev in day.events"
                  :key="ev.id"
                    class="group relative flex items-start gap-3 overflow-hidden rounded-xl border border-l-[3px] border-stone-200 bg-white p-3 transition-all dark:border-stone-700 dark:bg-stone-900"
                    :class="[tmpl.colors.cardLeftBorder, tmpl.colors.cardBorderHover]"
                  >
                    <!-- カード内装飾アイコン（デコレーション配列をローテーション） -->
                    <UIcon
                      v-if="tmpl.decorations.length > 0"
                      :name="tmpl.decorations[ev.sort_order % tmpl.decorations.length]!.icon"
                      aria-hidden="true"
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
                        <span v-if="ev.start_time" class="tabular-nums text-xs font-medium text-stone-400">
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
                        aria-label="イベントを編集"
                        @click="openEditEvent(day.id, ev)"
                      />
                      <UButton
                        icon="i-lucide-trash-2"
                        variant="ghost"
                        size="xs"
                        aria-label="イベントを削除"
                        class="text-stone-400 hover:text-red-500"
                        @click="confirmDeleteEvent(day.id, ev.id, ev.title)"
                      />
                    </div>
                </div>
              </VueDraggable>

              <!-- イベント追加ボタン -->
              <UButton
                icon="i-lucide-plus"
                variant="outline"
                block
                class="mt-2 rounded-xl border-2 border-dashed"
                :class="[tmpl.colors.addBtnBorderHover, tmpl.colors.addBtnTextHover, tmpl.colors.addBtnBorderHoverDark]"
                @click="openAddEvent(day.id)"
              >
                イベントを追加
              </UButton>
            </div>
        </VueDraggable>

        <!-- 日程追加ボタン -->
        <UButton
          icon="i-lucide-plus-circle"
          variant="outline"
          size="lg"
          block
          class="rounded-xl border-2 border-dashed"
          :class="[tmpl.colors.addBtnBorderHover, tmpl.colors.addBtnTextHover, tmpl.colors.addBtnBorderHoverDark]"
          @click="addDay"
        >
          日程を追加
        </UButton>
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
    v-model:show="showEventModal"
    :day-id="selectedDayId"
    :event="selectedEvent"
    @saved="onEventSaved"
  />

  <!-- 共有設定モーダル -->
  <ShioriShareModal
    v-if="shiori"
    v-model:show="showShareModal"
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
      <UButton color="error" :loading="deleting" @click="handleDeleteShiori">
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
      <UButton color="error" :loading="deletingItem" @click="handleDeleteDay">
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
      <UButton color="error" :loading="deletingItem" @click="handleDeleteEvent">
        削除する
      </UButton>
    </template>
  </UModal>
</template>
