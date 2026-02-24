<template>
  <!-- ローディング -->
  <div v-if="loading" class="flex h-dvh items-center justify-center">
    <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-orange-500" />
  </div>

  <!-- エラー -->
  <div v-else-if="error" class="flex h-dvh flex-col items-center justify-center gap-4 px-4">
    <UIcon name="i-lucide-alert-circle" class="size-12 text-stone-300" />
    <p class="text-sm text-stone-500">
      {{ error }}
    </p>
    <UButton
      icon="i-lucide-arrow-left"
      variant="soft"
      :to="`/shiori/${shioriId}`"
    >
      エディタに戻る
    </UButton>
  </div>

  <!-- マップ表示 -->
  <div v-else-if="shiori" class="flex h-dvh">
    <!-- サイドバー（イベント一覧） -->
    <Transition name="slide">
      <div
        v-if="showSidebar"
        class="fixed inset-0 z-40 w-full shrink-0 border-r border-stone-200 bg-white md:relative md:inset-auto md:w-80 dark:border-stone-700 dark:bg-stone-900"
      >
        <!-- サイドバーヘッダー -->
        <div class="flex h-14 items-center justify-between border-b border-stone-200 px-3 dark:border-stone-700">
          <h2 class="truncate text-sm font-semibold text-stone-900 dark:text-stone-50">
            {{ shiori.title }}
          </h2>
          <UButton
            icon="i-lucide-x"
            variant="ghost"
            size="sm"
            class="md:hidden"
            @click="showSidebar = false"
          />
        </div>

        <!-- イベントリスト -->
        <div class="h-[calc(100dvh-3.5rem)]">
          <MapEventList
            :days="shiori.days || []"
            v-model:selected-day-numbers="selectedDays"
            @event-click="focusEvent"
            @event-edit="openEventEdit"
          />
        </div>
      </div>
    </Transition>

    <!-- マップ本体 -->
    <div class="relative min-w-0 flex-1">
      <!-- ツールバー -->
      <div class="absolute left-3 top-3 z-10 flex gap-2">
        <UButton
          icon="i-lucide-arrow-left"
          variant="solid"
          color="neutral"
          size="sm"
          :to="`/shiori/${shioriId}`"
        >
          <span class="hidden sm:inline">エディタに戻る</span>
        </UButton>
        <UButton
          icon="i-lucide-list"
          variant="solid"
          color="neutral"
          size="sm"
          @click="showSidebar = !showSidebar"
        />
        <UButton
          icon="i-lucide-maximize-2"
          variant="solid"
          color="neutral"
          size="sm"
          @click="mapViewRef?.fitBounds()"
        />
        <UButton
          icon="i-lucide-external-link"
          variant="solid"
          color="neutral"
          size="sm"
          @click="openInGoogleMaps"
        >
          <span class="hidden sm:inline">Google Mapで開く</span>
        </UButton>
      </div>

      <!-- 位置情報なしの通知 -->
      <div
        v-if="eventsWithoutLocation > 0"
        class="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-stone-900/80 px-3 py-1.5 text-xs text-white backdrop-blur-sm"
      >
        {{ eventsWithoutLocation }}件のイベントに位置情報がありません
      </div>

      <MapView
        ref="mapViewRef"
        :days="shiori.days || []"
        :selected-day-numbers="selectedDays"
        @marker-click="handleMarkerClick"
      />
    </div>

    <!-- イベント編集モーダル -->
    <ShioriEventFormModal
      v-model="showEventModal"
      :day-id="editDayId"
      :event="editEvent"
      @saved="onEventSaved"
    />
  </div>
</template>

<script setup lang="ts">
import type { ShioriWithRole, Event } from '~~/types/database'
import MapViewComponent from '~~/app/components/map/MapView.vue'

definePageMeta({
  layout: false,
  middleware: 'auth',
  ssr: false,
})

const route = useRoute()
const { authFetch } = useAuthFetch()
const toast = useToast()
const shioriId = route.params.id as string

const shiori = ref<ShioriWithRole | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const showSidebar = ref(true)
const selectedDays = ref<number[]>([])
const mapViewRef = ref<InstanceType<typeof MapViewComponent> | null>(null)

// イベント編集モーダル用
const showEventModal = ref(false)
const editEvent = ref<Event | null>(null)
const editDayId = ref('')

// 位置情報のないイベント数
const eventsWithoutLocation = computed(() => {
  if (!shiori.value?.days) return 0
  return shiori.value.days
    .flatMap(d => d.events)
    .filter(ev => ev.lat == null || ev.lng == null)
    .length
})

// モバイルではサイドバーを初期非表示
onMounted(async () => {
  if (window.innerWidth < 768) {
    showSidebar.value = false
  }
  await fetchShiori()
})

async function fetchShiori() {
  loading.value = true
  error.value = null
  try {
    shiori.value = await authFetch<ShioriWithRole>(`/api/shiori/${shioriId}`)
  }
  catch (e) {
    console.error('しおり取得エラー:', e)
    error.value = 'しおりの取得に失敗しました'
    toast.add({ title: 'しおりの取得に失敗しました', color: 'error' })
  }
  finally {
    loading.value = false
  }
}

/** イベントクリック時にマップ上でフォーカス */
function focusEvent(ev: Event) {
  if (ev.lat != null && ev.lng != null) {
    mapViewRef.value?.panTo(ev.lat, ev.lng, 16)
    // モバイルではサイドバーを閉じる
    if (window.innerWidth < 768) {
      showSidebar.value = false
    }
  }
}

function handleMarkerClick(_ev: Event) {
  // マーカークリック時の追加処理が必要な場合ここに追加
}

/** Google Maps 本体でルートを開く */
function openInGoogleMaps() {
  const url = mapViewRef.value?.getGoogleMapsRouteUrl()
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  else {
    toast.add({ title: '位置情報のあるイベントがありません', color: 'warning' })
  }
}

/** サイドバーから編集ボタンクリック */
function openEventEdit(ev: Event, dayId: string) {
  editEvent.value = ev
  editDayId.value = dayId
  showEventModal.value = true
}

/** イベント保存後にデータを更新 */
async function onEventSaved(savedEvent: Event) {
  if (!shiori.value?.days) return

  // ローカルのイベントデータを更新
  for (const day of shiori.value.days) {
    const idx = day.events.findIndex(e => e.id === savedEvent.id)
    if (idx !== -1) {
      day.events[idx] = savedEvent
      break
    }
  }
}
</script>

<style scoped>
/* サイドバーのスライドアニメーション */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.2s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}
</style>
