<template>
  <!-- nuxt-ui-direct: 日付選択ポップオーバーの基盤（カスタムトリガーが必要） -->
  <UPopover v-model:open="isOpen">
    <button
      type="button"
      :disabled="disabled"
      class="flex min-h-9 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm outline-none ring-1 ring-inset ring-stone-300 transition-shadow focus-within:ring-2 focus-within:ring-inset focus-within:ring-[var(--ui-primary)] dark:ring-stone-600"
      :class="[
        isOpen ? 'ring-2 ring-inset ring-[var(--ui-primary)]' : '',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer bg-white dark:bg-stone-800',
      ]"
    >
      <UIcon name="i-lucide-calendar" class="size-4 shrink-0 text-stone-400" />
      <span v-if="displayValue" class="text-stone-900 dark:text-stone-50">{{ displayValue }}</span>
      <span v-else class="text-stone-400">{{ placeholder }}</span>
      <UIcon
        v-if="clearable && (startDate || endDate)"
        name="i-lucide-x-circle"
        class="ml-auto size-4 shrink-0 text-stone-400 hover:text-stone-600"
        @click.stop="handleClear"
      />
    </button>

    <template #content>
      <div class="p-2">
        <!-- nuxt-ui-direct: UCalendar 日付範囲選択 -->
        <UCalendar
          v-if="range"
          v-model="calendarRangeValue"
          range
          :number-of-months="numberOfMonths"
          :maximum-days="maximumDays"
        />
        <!-- nuxt-ui-direct: UCalendar 単一日付選択 -->
        <UCalendar
          v-else
          v-model="calendarSingleValue"
        />
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import { CalendarDate } from '@internationalized/date'

interface Props {
  range?: boolean
  numberOfMonths?: number
  maximumDays?: number
  placeholder?: string
  disabled?: boolean
  clearable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  range: false,
  numberOfMonths: 2,
  placeholder: '日付を選択',
  clearable: false,
})

// 範囲モード: start / end の2つのモデル
const startDate = defineModel<string | null>('startDate', { default: null })
const endDate = defineModel<string | null>('endDate', { default: null })
// 単一モード: date のみ
const date = defineModel<string | null>('date', { default: null })

const isOpen = ref<boolean>(false)

/** "YYYY-MM-DD" → CalendarDate */
function toCalendarDate(dateStr: string): CalendarDate {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new CalendarDate(y!, m!, d!)
}

/** CalendarDate → "YYYY-MM-DD"（タイムゾーン変換なしで安全に文字列化） */
function toDateString(cd: DateValue): string {
  return `${cd.year}-${String(cd.month).padStart(2, '0')}-${String(cd.day).padStart(2, '0')}`
}

// 範囲選択用の v-model ブリッジ
const calendarRangeValue = computed<{ start: CalendarDate; end: CalendarDate } | undefined>({
  get() {
    if (!startDate.value || !endDate.value) return undefined
    return {
      start: toCalendarDate(startDate.value),
      end: toCalendarDate(endDate.value),
    }
  },
  set(val) {
    if (!val?.start || !val?.end) return
    startDate.value = toDateString(val.start)
    endDate.value = toDateString(val.end)
    isOpen.value = false
  },
})

// 単一選択用の v-model ブリッジ
const calendarSingleValue = computed<CalendarDate | undefined>({
  get() {
    if (!date.value) return undefined
    return toCalendarDate(date.value)
  },
  set(val) {
    if (!val) return
    date.value = toDateString(val)
    isOpen.value = false
  },
})

// 表示テキスト
const displayValue = computed<string>(() => {
  if (props.range) {
    if (!startDate.value) return ''
    if (!endDate.value) return startDate.value
    return `${startDate.value} 〜 ${endDate.value}`
  }
  return date.value || ''
})

function handleClear() {
  if (props.range) {
    startDate.value = null
    endDate.value = null
  }
  else {
    date.value = null
  }
}
</script>
