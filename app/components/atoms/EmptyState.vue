<template>
  <div class="flex flex-col items-center justify-center px-4 py-12 text-center">
    <div
      v-if="iconBg"
      class="mb-4 flex items-center justify-center rounded-full"
      :class="iconBgClass"
    >
      <UIcon :name="icon" :class="iconClass" />
    </div>
    <UIcon v-else :name="icon" class="mb-2 size-8 text-stone-300" />
    <h3 v-if="title" class="mb-2 text-lg font-semibold text-stone-900 dark:text-stone-50">
      {{ title }}
    </h3>
    <p class="text-sm text-stone-400">
      {{ message }}
    </p>
    <div v-if="$slots.action" class="mt-6">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  icon: string
  message: string
  title?: string
  iconBg?: boolean
}>(), {
  title: undefined,
  iconBg: false,
})

// アイコン背景ありの場合のスタイル
const iconBgClass = 'size-20 bg-amber-50 dark:bg-amber-900/20'
const iconClass = 'size-10 text-amber-700 dark:text-amber-400'
</script>
