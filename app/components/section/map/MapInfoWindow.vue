<template>
  <div class="min-w-40 max-w-65 p-1">
    <div class="mb-0.5 flex items-start gap-2">
      <span class="flex-1 text-sm font-semibold text-stone-900 dark:text-stone-50">{{ event.title }}</span>
      <UButton
        icon="i-lucide-x"
        variant="ghost"
        size="xs"
        color="neutral"
        aria-label="閉じる"
        class="shrink-0"
        @click="emit('close')"
      />
    </div>
    <div class="mb-0.5 flex items-center gap-1.5">
      <span
        class="inline-block size-2 shrink-0 rounded-full"
        :style="{ background: color }"
      />
      <span class="text-[11px] text-stone-500 dark:text-stone-400">
        Day {{ dayNumber }} / {{ getCategoryLabel(event.category) }}
      </span>
    </div>
    <div v-if="event.start_time" class="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
      {{ event.start_time }}
      <template v-if="event.end_time"> ~ {{ event.end_time }}</template>
    </div>
    <div v-if="event.address" class="mt-1 text-[11px] text-stone-400 dark:text-stone-500">
      <UIcon name="i-lucide-map-pin" class="mr-0.5 inline-block size-3 align-text-bottom" />
      {{ event.address }}
    </div>
    <UButton
      :href="gmapsUrl"
      target="_blank"
      variant="link"
      size="xs"
      icon="i-lucide-external-link"
      trailing
      class="mt-1.5 px-0"
    >
      Google Mapで開く
    </UButton>
  </div>
</template>

<script setup lang="ts">
import type { Event } from '~~/types/database'
import { getCategoryLabel } from '~~/shared/category-icons'

const props = defineProps<{
  event: Event
  dayNumber: number
  color: string
}>()

const emit = defineEmits<{
  close: []
}>()

const gmapsUrl = computed(() => {
  const coords = `${props.event.lat},${props.event.lng}`
  return props.event.place_id
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords)}&query_place_id=${encodeURIComponent(props.event.place_id)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords)}`
})
</script>
