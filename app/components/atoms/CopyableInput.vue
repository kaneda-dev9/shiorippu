<template>
  <div class="flex items-center gap-2">
    <UInput
      :model-value="value"
      readonly
      class="flex-1"
      :icon="icon"
    />
    <UButton
      :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
      :variant="copied ? 'soft' : 'solid'"
      @click="handleCopy"
    >
      {{ copied ? 'コピー済み' : 'コピー' }}
    </UButton>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  value: string
  icon?: string
  toastMessage?: string
}>()

const { copy, copied } = useClipboard()
const toast = useToast()

function handleCopy() {
  copy(props.value)
  if (props.toastMessage) {
    toast.add({ title: props.toastMessage, color: 'success' })
  }
}
</script>
