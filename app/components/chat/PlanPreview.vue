<script setup lang="ts">
import type { TripPlan } from '~~/types/database'
import { getCategoryIcon, getCategoryLabel } from '~~/shared/category-icons'

const props = defineProps<{
  plan: TripPlan
  shioriId: string
  applied?: boolean
}>()

const emit = defineEmits<{
  apply: [plan: TripPlan]
}>()

const applying = ref(false)

function handleApply() {
  if (applying.value || props.applied) return
  applying.value = true
  emit('apply', props.plan)
}

// 親から適用完了が通知されたらボタン状態を戻す
watch(() => props.applied, (val) => {
  if (val) applying.value = false
})
</script>

<template>
  <div class="mt-3 overflow-hidden rounded-xl border border-orange-200 bg-orange-50/50 dark:border-orange-800/50 dark:bg-orange-900/10">
    <!-- ヘッダー -->
    <div class="flex items-center gap-2 border-b border-orange-200 bg-orange-100/50 px-4 py-2.5 dark:border-orange-800/50 dark:bg-orange-900/20">
      <UIcon name="i-lucide-map" class="size-4 text-orange-500" />
      <span class="text-sm font-semibold text-orange-700 dark:text-orange-300">旅行プラン</span>
      <UBadge variant="subtle" size="xs" color="primary">
        {{ plan.days.length }}日間
      </UBadge>
    </div>

    <!-- 日ごとのタイムライン -->
    <div class="max-h-80 overflow-y-auto px-4 py-3">
      <div v-for="day in plan.days" :key="day.day_number" class="mb-3 last:mb-0">
        <!-- Day ヘッダー -->
        <div class="mb-1.5 flex items-center gap-1.5">
          <span class="text-xs font-bold text-orange-500">Day {{ day.day_number }}</span>
          <span v-if="day.date" class="text-xs text-stone-400">{{ day.date }}</span>
        </div>

        <!-- イベントリスト -->
        <div class="ml-2 space-y-1 border-l-2 border-orange-200 pl-3 dark:border-orange-800/50">
          <div
            v-for="(ev, evIdx) in day.events"
            :key="evIdx"
            class="flex items-start gap-2 py-0.5"
          >
            <!-- カテゴリアイコン -->
            <div class="flex size-6 shrink-0 items-center justify-center rounded bg-white dark:bg-stone-800">
              <UIcon :name="getCategoryIcon(ev.category)" class="size-3.5 text-orange-500" />
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5">
                <span v-if="ev.start_time" class="text-[10px] font-medium text-stone-400">
                  {{ ev.start_time }}
                  <template v-if="ev.end_time">-{{ ev.end_time }}</template>
                </span>
                <span class="text-xs font-medium text-stone-700 dark:text-stone-200">{{ ev.title }}</span>
              </div>
              <p v-if="ev.memo" class="text-[10px] leading-tight text-stone-400">
                {{ ev.memo }}
              </p>
            </div>

            <UBadge variant="subtle" size="xs" class="shrink-0 text-[10px]">
              {{ getCategoryLabel(ev.category) }}
            </UBadge>
          </div>
        </div>
      </div>
    </div>

    <!-- 適用ボタン -->
    <div class="border-t border-orange-200 px-4 py-3 dark:border-orange-800/50">
      <UButton
        v-if="!applied"
        icon="i-lucide-wand-sparkles"
        class="w-full justify-center"
        :loading="applying"
        :disabled="applying"
        @click="handleApply"
      >
        このプランでしおりを作る
      </UButton>
      <div
        v-else
        class="flex items-center justify-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400"
      >
        <UIcon name="i-lucide-check-circle" class="size-4" />
        しおりに適用済み
      </div>
    </div>
  </div>
</template>
