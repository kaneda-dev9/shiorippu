<template>
  <div class="flex h-full flex-col overflow-hidden">
    <!-- Day フィルタータブ -->
    <div class="flex flex-wrap gap-1 border-b border-stone-200 p-3 dark:border-stone-700">
      <UButton
        v-for="day in days"
        :key="day.id"
        :variant="isSelected(day.day_number) ? 'soft' : 'ghost'"
        size="xs"
        @click="toggleDay(day.day_number)"
      >
        <span
          class="mr-1 inline-block size-2 rounded-full"
          :style="{ backgroundColor: getDayColor(day.day_number) }"
        />
        Day {{ day.day_number }}
      </UButton>
      <UButton
        variant="ghost"
        size="xs"
        @click="selectAll"
      >
        すべて
      </UButton>
    </div>

    <!-- イベント一覧 -->
    <div class="flex-1 overflow-y-auto">
      <template v-for="day in filteredDays" :key="day.id">
        <!-- Day ヘッダー -->
        <div
          class="sticky top-0 z-10 flex items-center gap-2 border-b border-stone-100 bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400"
        >
          <span
            class="inline-block size-2.5 rounded-full"
            :style="{ backgroundColor: getDayColor(day.day_number) }"
          />
          Day {{ day.day_number }}
          <span v-if="day.date" class="font-normal text-stone-400">
            ({{ day.date }})
          </span>
        </div>

        <!-- イベントカード -->
        <div
          v-for="(ev, idx) in day.events"
          :key="ev.id"
          class="group cursor-pointer border-b border-stone-100 px-3 py-2.5 transition-colors hover:bg-orange-50 dark:border-stone-800 dark:hover:bg-orange-900/10"
          :class="{ 'opacity-40': !ev.lat || !ev.lng }"
          @click="handleEventClick(ev)"
        >
          <div class="flex items-start gap-2">
            <span
              class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
              :style="{ backgroundColor: getDayColor(day.day_number) }"
            >
              {{ idx + 1 }}
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-1">
                <p class="truncate text-sm font-medium text-stone-900 dark:text-stone-50">
                  {{ ev.title }}
                </p>
                <UButton
                  icon="i-lucide-pencil"
                  variant="ghost"
                  size="xs"
                  class="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  @click.stop="emit('event-edit', ev, day.id)"
                />
              </div>
              <div class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-stone-400">
                <span v-if="ev.start_time">
                  {{ ev.start_time }}{{ ev.end_time ? ` ~ ${ev.end_time}` : '' }}
                </span>
                <span v-if="ev.address" class="truncate">
                  {{ ev.address }}
                </span>
              </div>
              <!-- 位置情報なし表示 -->
              <p v-if="!ev.lat || !ev.lng" class="mt-0.5 text-xs text-stone-300 dark:text-stone-600">
                位置情報なし
              </p>
            </div>
          </div>
        </div>

        <!-- Dayにイベントがない場合 -->
        <div
          v-if="day.events.length === 0"
          class="px-3 py-4 text-center text-xs text-stone-300 dark:text-stone-600"
        >
          イベントなし
        </div>
      </template>

      <!-- Dayがない場合 -->
      <div
        v-if="filteredDays.length === 0"
        class="flex flex-col items-center justify-center px-4 py-12 text-center"
      >
        <UIcon name="i-lucide-calendar-off" class="mb-2 size-8 text-stone-300" />
        <p class="text-sm text-stone-400">
          表示する日程がありません
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DayWithEvents, Event } from '~~/types/database'
import { getDayColor } from '~~/shared/day-colors'

const props = defineProps<{
  days: DayWithEvents[]
}>()

const emit = defineEmits<{
  'event-click': [event: Event]
  'event-edit': [event: Event, dayId: string]
}>()

const selectedDayNumbers = defineModel<number[]>('selectedDayNumbers', { default: () => [] })

const filteredDays = computed(() => {
  if (selectedDayNumbers.value.length === 0) return props.days
  return props.days.filter(d => selectedDayNumbers.value.includes(d.day_number))
})

function isSelected(dayNumber: number): boolean {
  return selectedDayNumbers.value.length === 0 || selectedDayNumbers.value.includes(dayNumber)
}

function toggleDay(dayNumber: number) {
  const current = selectedDayNumbers.value
  if (current.length === 0) {
    // 「すべて」状態 → 1つだけ選択
    selectedDayNumbers.value = [dayNumber]
  }
  else if (current.includes(dayNumber)) {
    const next = current.filter(n => n !== dayNumber)
    // 最後の1つを外した場合は「すべて」に戻す
    selectedDayNumbers.value = next.length === 0 ? [] : next
  }
  else {
    selectedDayNumbers.value = [...current, dayNumber]
  }
}

function selectAll() {
  selectedDayNumbers.value = []
}

function handleEventClick(ev: Event) {
  emit('event-click', ev)
}
</script>
