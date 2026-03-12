<script setup lang="ts">
import { getTemplateList } from '~~/shared/templates'

defineProps<{
  disabled?: boolean
}>()

const selected = defineModel<string>('selected', { required: true })

const templateList = getTemplateList()
</script>

<template>
  <div class="grid grid-cols-2 gap-2 sm:grid-cols-5">
    <button
      v-for="t in templateList"
      :key="t.id"
      :disabled="disabled"
      class="group relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all"
      :class="[
        selected === t.id
          ? 'border-orange-400 bg-orange-50/50 ring-2 ring-orange-400/30 dark:bg-orange-900/10'
          : 'border-stone-200 hover:border-stone-300 dark:border-stone-700 dark:hover:border-stone-600',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      ]"
      @click="selected = t.id"
    >
      <!-- グラデーションプレビュー -->
      <div
        class="h-8 w-full rounded-lg bg-gradient-to-r"
        :class="t.previewGradient"
      />
      <!-- テンプレート名 -->
      <div class="flex items-center gap-1">
        <UIcon :name="t.icon" class="size-3.5 text-stone-500 dark:text-stone-400" />
        <span class="text-xs font-medium text-stone-700 dark:text-stone-300">
          {{ t.name }}
        </span>
      </div>
      <!-- 選択チェック -->
      <div
        v-if="selected === t.id"
        class="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-orange-500 text-white"
      >
        <UIcon name="i-lucide-check" class="size-3" />
      </div>
    </button>
  </div>
</template>
