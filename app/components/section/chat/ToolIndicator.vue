<template>
  <div class="mt-2 flex items-center gap-2 text-xs text-orange-500">
    <UIcon name="i-lucide-search" class="size-3.5 animate-pulse" />
    <span>{{ label }}…</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
}>()
</script>
