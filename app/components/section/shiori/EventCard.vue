<template>
  <UCard
    variant="outline"
    class="group border-l-[3px] transition-all"
    :class="[tmpl.colors.cardLeftBorder, tmpl.colors.cardBorderHover]"
    :ui="{ header: 'p-3 sm:p-4 border-b-0', body: 'p-3 pt-0 sm:p-4 sm:pt-0' }"
  >
    <!-- ヘッダー: ドラッグ・アイコン・時間・バッジ・アクション -->
    <template #header>
      <div class="flex items-center gap-2">
        <span class="event-drag-handle -m-1 flex shrink-0 cursor-grab items-center justify-center p-1 active:cursor-grabbing">
          <UIcon
            name="i-lucide-grip-vertical"
            class="size-4 text-stone-300"
            :class="tmpl.colors.dragHandleHover"
          />
        </span>
        <div class="flex size-8 shrink-0 items-center justify-center rounded-lg" :class="[tmpl.colors.eventIconBg, tmpl.colors.accentBgDark]">
          <UIcon :name="getCategoryIcon(event.category)" class="size-4" :class="tmpl.colors.eventIconText" />
        </div>
        <span v-if="event.start_time" class="shrink-0 tabular-nums text-xs font-medium text-stone-400">
          {{ event.start_time.slice(0, 5) }}
          <template v-if="event.end_time"> - {{ event.end_time.slice(0, 5) }}</template>
        </span>
        <span
          class="inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium"
          :class="[tmpl.colors.badgeText, tmpl.colors.badgeBg]"
        >
          {{ getCategoryLabel(event.category) }}
        </span>
        <UBadge
          v-if="event.booking_status && event.booking_status !== 'none'"
          :color="bookingStatusConfig[event.booking_status].color as any"
          variant="subtle"
          size="xs"
        >
          <UIcon :name="bookingStatusConfig[event.booking_status].icon" class="size-3" />
          {{ bookingStatusConfig[event.booking_status].label }}
        </UBadge>
        <div class="ml-auto flex shrink-0 gap-3 transition-opacity md:opacity-0 md:group-hover:opacity-100">
          <UButton
            icon="i-lucide-pencil"
            variant="ghost"
            size="xs"
            aria-label="イベントを編集"
            @click="emit('edit')"
          />
          <UButton
            icon="i-lucide-trash-2"
            variant="ghost"
            size="xs"
            aria-label="イベントを削除"
            class="text-stone-400 hover:text-red-500"
            @click="emit('delete')"
          />
        </div>
      </div>
    </template>

    <!-- ボディ: タイトル・場所・メモ・URL -->
    <p class="font-medium text-stone-900 dark:text-stone-50">
      {{ event.title }}
    </p>
    <p v-if="event.address" class="mt-1 flex items-center gap-1 text-xs text-stone-400">
      <UIcon name="i-lucide-map-pin" class="size-3 shrink-0" />
      {{ event.address }}
    </p>
    <p v-if="event.memo" class="mt-1 text-xs text-stone-500">
      {{ event.memo }}
    </p>
    <a
      v-if="event.url"
      :href="event.url"
      target="_blank"
      rel="noopener noreferrer"
      class="mt-1 inline-flex items-center gap-1 text-xs hover:underline"
      :class="[tmpl.colors.link, tmpl.colors.linkHover]"
    >
      <UIcon name="i-lucide-external-link" class="size-3" />
      {{ event.url.replace(/^https?:\/\//, '').split('/')[0] }}
    </a>
  </UCard>
</template>

<script setup lang="ts">
import type { Event } from '~~/types/database'
import type { ShioriTemplate } from '~~/shared/templates'
import { getCategoryIcon, getCategoryLabel } from '~~/shared/category-icons'
import { bookingStatusConfig } from '~~/shared/booking-status'

defineProps<{
  event: Event
  tmpl: ShioriTemplate
}>()

const emit = defineEmits<{
  edit: []
  delete: []
}>()
</script>
