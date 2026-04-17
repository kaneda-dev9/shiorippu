<script setup lang="ts">
import { useQuery } from '@pinia/colada'
import type { ShioriWithDays } from '~~/types/database'
import { getCategoryIcon, getCategoryLabel } from '~~/shared/category-icons'
import { bookingStatusConfig } from '~~/shared/booking-status'
// formatDateJa, formatDateRange は app/utils/date.ts から auto-import

definePageMeta({
  layout: 'default',
})

const route = useRoute()
const shioriId = route.params.id as string

// 認証ヘッダーなしで呼ぶ（公開しおりのみ取得可能）
const { data: shiori, asyncStatus, error } = useQuery({
  key: () => publicShioriKeys.detail(shioriId),
  query: () => $fetch<ShioriWithDays>(`/api/shiori/${shioriId}`),
  refetchOnWindowFocus: false,
})
const loading = computed(() => asyncStatus.value === 'loading')

</script>

<template>
  <!-- ローディング -->
  <div v-if="loading" class="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
    <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-amber-700 dark:text-amber-400" />
  </div>

  <!-- エラー: 非公開 or 存在しない -->
  <div v-else-if="error" class="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
    <div class="text-center">
      <div class="mb-4 text-6xl">
        🔒
      </div>
      <h1 class="mb-2 text-2xl font-bold text-stone-900 dark:text-stone-50">
        ページが見つかりません
      </h1>
      <p class="mb-6 text-stone-500">
        このしおりは非公開か、存在しないURLです。
      </p>
      <UButton to="/" variant="outline">
        トップページへ
      </UButton>
    </div>
  </div>

  <!-- 公開しおり表示 -->
  <div v-else-if="shiori" class="mx-auto max-w-3xl">
    <!-- カバー画像ヒーロー -->
    <div class="relative h-56 overflow-hidden sm:h-64">
      <img
        v-if="shiori.cover_image_url"
        :src="shiori.cover_image_url"
        :alt="shiori.title"
        class="size-full object-cover"
      >
      <div
        v-else
        class="size-full bg-gradient-to-r from-stone-400 to-stone-500"
      />
      <!-- ダークオーバーレイ -->
      <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10" />
      <!-- ヘッダーコンテンツ（オーバーレイ上） -->
      <div class="absolute inset-x-0 bottom-0 px-4 pb-6">
        <div class="text-center">
          <h1 class="text-2xl font-bold text-white drop-shadow-md sm:text-3xl">
            {{ shiori.title }}
          </h1>
          <div class="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm text-white/80">
            <span v-if="shiori.area" class="flex items-center gap-1">
              <UIcon name="i-lucide-map-pin" class="size-4" />
              {{ shiori.area }}
            </span>
            <span v-if="shiori.start_date" class="flex items-center gap-1">
              <UIcon name="i-lucide-calendar" class="size-4" />
              <template v-if="shiori.end_date">
                {{ formatDateRange(shiori.start_date, shiori.end_date) }}
              </template>
              <template v-else>
                {{ formatDateJa(shiori.start_date) }}
              </template>
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="px-4 py-8">

    <!-- 空の状態 -->
    <div v-if="shiori.days.length === 0" class="py-16 text-center">
      <p class="text-stone-400">
        まだ予定が登録されていません
      </p>
    </div>

    <!-- 日程リスト（読み取り専用） -->
    <div v-else class="space-y-8">
      <div v-for="day in shiori.days" :key="day.id">
        <!-- 日程ヘッダー -->
        <h2 class="mb-4 flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
          <UIcon name="i-lucide-calendar-days" class="size-4" />
          Day {{ day.day_number }}
          <span v-if="day.date" class="text-stone-400">{{ formatDateJa(day.date) }}</span>
        </h2>

        <!-- イベントなし -->
        <p v-if="day.events.length === 0" class="py-4 text-center text-sm text-stone-400">
          この日の予定はありません
        </p>

        <!-- イベントタイムライン -->
        <div v-else class="space-y-3">
          <div
            v-for="ev in day.events"
            :key="ev.id"
            class="relative flex items-start gap-3 overflow-hidden rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-700 dark:bg-stone-900"
          >
            <!-- カテゴリアイコン -->
            <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-stone-100 dark:bg-stone-800">
              <UIcon :name="getCategoryIcon(ev.category)" class="size-5 text-stone-500 dark:text-stone-400" />
            </div>

            <!-- イベント情報 -->
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span v-if="ev.start_time" class="tabular-nums text-xs font-medium text-stone-400">
                  {{ ev.start_time.slice(0, 5) }}
                  <template v-if="ev.end_time"> - {{ ev.end_time.slice(0, 5) }}</template>
                </span>
                <span
                  class="inline-flex items-center rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300"
                >
                  {{ getCategoryLabel(ev.category) }}
                </span>
                <!-- 予約ステータスバッジ -->
                <UBadge
                  v-if="ev.booking_status && ev.booking_status !== 'none'"
                  :color="bookingStatusConfig[ev.booking_status].color as any"
                  variant="subtle"
                  size="xs"
                >
                  <UIcon :name="bookingStatusConfig[ev.booking_status].icon" class="size-3" />
                  {{ bookingStatusConfig[ev.booking_status].label }}
                </UBadge>
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
                class="mt-1 inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-800 hover:underline dark:text-amber-400 dark:hover:text-amber-300"
              >
                <UIcon name="i-lucide-external-link" class="size-3" />
                {{ ev.url.replace(/^https?:\/\//, '').split('/')[0] }}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- PDF出力ボタン -->
    <div class="mt-8 flex justify-center">
      <SectionShioriPdfExportButton
        :shiori="shiori"
        variant="outline"
        size="md"
      >
        PDFでダウンロード
      </SectionShioriPdfExportButton>
    </div>

    <!-- フッター -->
    <div class="mt-8 border-t border-stone-200 pt-6 text-center text-xs text-stone-400 dark:border-stone-700">
      <p>
        <NuxtLink to="/" class="text-amber-700 hover:underline dark:text-amber-400">
          しおりっぷ
        </NuxtLink>
        で作成された旅のしおり
      </p>
    </div>
    </div><!-- /px-4 py-8 -->
  </div>
</template>
