<template>
  <div class="py-8 text-center">
    <div class="mb-3 text-4xl">
      ✈️
    </div>
    <h3 class="mb-2 text-lg font-semibold text-stone-900 dark:text-stone-50">
      旅行プランを一緒に考えましょう！
    </h3>
    <p class="mb-4 text-sm text-stone-500">
      どんな旅がしたいか、気軽に話しかけてください
    </p>
    <div class="flex flex-wrap justify-center gap-2">
      <UButton
        v-for="suggestion in suggestions"
        :key="suggestion"
        variant="outline"
        size="sm"
        @click="emit('send', suggestion)"
      >
        {{ suggestion }}
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  send: [text: string]
}>()

const suggestions = [
  'のんびりリフレッシュしたい',
  '友達とグルメ旅がしたい',
  '家族で温泉に行きたい',
  '記念日のお祝い旅行',
  'おすすめの旅先を教えて',
]
</script>
