<template>
  <div>
    <!-- カテゴリフィルター -->
    <div class="day-tab-scroll mb-3 flex items-center gap-1.5 overflow-x-auto">
      <button
        class="shrink-0 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-all"
        :class="!activeCategory
          ? 'bg-stone-700 text-white dark:bg-stone-300 dark:text-stone-900'
          : 'text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800'
        "
        @click="activeCategory = null"
      >
        すべて
      </button>
      <button
        v-for="cat in coverCategories"
        :key="cat.value"
        class="shrink-0 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-all"
        :class="activeCategory === cat.value
          ? 'bg-stone-700 text-white dark:bg-stone-300 dark:text-stone-900'
          : 'text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800'
        "
        @click="activeCategory = cat.value"
      >
        {{ cat.label }}
      </button>
    </div>

    <!-- 画像グリッド -->
    <div class="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
      <button
        v-for="preset in filteredPresets"
        :key="preset.id"
        class="group relative aspect-[5/2] overflow-hidden rounded-lg border-2 transition-all"
        :class="selected === preset.path
          ? 'border-orange-400 ring-2 ring-orange-400/30'
          : 'border-transparent hover:border-stone-300 dark:hover:border-stone-600'
        "
        @click="selected = preset.path"
      >
        <img
          :src="preset.path"
          :alt="preset.label"
          loading="lazy"
          class="size-full object-cover transition-transform group-hover:scale-105"
        >
        <!-- ラベル -->
        <span class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 pb-1 pt-3 text-[10px] font-medium text-white">
          {{ preset.label }}
        </span>
        <!-- 選択チェック -->
        <div
          v-if="selected === preset.path"
          class="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-orange-500 text-white"
        >
          <UIcon name="i-lucide-check" class="size-3" />
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { coverCategories, coverImagePresets } from '~~/shared/cover-images'
import type { CoverCategory } from '~~/shared/cover-images'

const selected = defineModel<string | null>('selected', { default: null })

const activeCategory = ref<CoverCategory | null>(null)

const filteredPresets = computed(() => {
  if (!activeCategory.value) return coverImagePresets
  return coverImagePresets.filter((p) => p.category === activeCategory.value)
})
</script>
