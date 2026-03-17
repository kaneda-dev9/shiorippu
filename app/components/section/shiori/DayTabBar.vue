<template>
  <div class="day-tab-scroll flex items-center gap-1.5 overflow-x-auto">
    <button
      v-for="tab in items"
      :key="tab.value"
      class="relative shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold whitespace-nowrap transition-all duration-200"
      :class="activeDay === tab.value
        ? ['text-white shadow-sm', activeClass]
        : ['text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800']
      "
      @click="() => activeDay = tab.value"
    >
      {{ tab.label }}
    </button>
    <div class="ml-auto flex shrink-0 items-center gap-4">
      <UButton
        v-if="showDelete"
        icon="i-lucide-trash-2"
        variant="ghost"
        size="xs"
        aria-label="日程を削除"
        class="shrink-0 text-stone-400 hover:text-red-500"
        @click="emit('deleteDay')"
      />
      <UButton
        icon="i-lucide-plus"
        variant="ghost"
        size="xs"
        aria-label="日程を追加"
        :loading="adding"
        class="shrink-0"
        @click="emit('addDay')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
export interface DayTabItem {
  label: string
  value: string
}

defineProps<{
  items: DayTabItem[]
  activeClass: string
  showDelete: boolean
  adding: boolean
}>()

const activeDay = defineModel<string>('activeDay', { default: '' })

const emit = defineEmits<{
  addDay: []
  deleteDay: []
}>()
</script>
