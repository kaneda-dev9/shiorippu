<template>
  <UModal
    v-model:open="show"
    :title="title"
    :description="description"
    :ui="{ footer: 'justify-end' }"
  >
    <template v-if="$slots.body" #body>
      <slot name="body" />
    </template>
    <template #footer="{ close }">
      <UButton variant="ghost" @click="close">
        {{ cancelLabel }}
      </UButton>
      <UButton :color="confirmColor" :loading="loading" @click="emit('confirm')">
        {{ confirmLabel }}
      </UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
type ButtonColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

withDefaults(defineProps<{
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  confirmColor?: ButtonColor
  loading?: boolean
}>(), {
  description: undefined,
  confirmLabel: '削除する',
  cancelLabel: 'キャンセル',
  confirmColor: 'error',
  loading: false,
})

const show = defineModel<boolean>('show', { default: false })

const emit = defineEmits<{
  confirm: []
}>()
</script>
