<template>
  <UTabs
    v-model="bridgedValue"
    :items="items"
    :color="color"
    :variant="variant"
    :size="size"
    :content="content"
    :ui="ui"
  >
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </UTabs>
</template>

<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'

defineProps<{
  items?: TabsItem[]
  color?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
  variant?: 'pill' | 'link'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  content?: boolean
  ui?: Record<string, unknown>
}>()

const value = defineModel<string | number>('value')

// UTabs は modelValue を使うため、ブリッジ用 computed
const bridgedValue = computed({
  get: () => value.value,
  set: (v) => { value.value = v },
})
</script>
