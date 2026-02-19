<script setup lang="ts">
import type { Shiori } from '~~/types/database'

const props = defineProps<{
  modelValue: boolean
  shiori: Shiori
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'updated': [isPublic: boolean]
}>()

const { authFetch } = useAuthFetch()
const toast = useToast()
const { copy, copied } = useClipboard()

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const isPublic = ref(props.shiori.is_public)
const toggling = ref(false)

// props変更に追従
watch(() => props.shiori.is_public, (v) => {
  isPublic.value = v
})

const shareUrl = computed(() => {
  if (import.meta.client) {
    return `${window.location.origin}/s/${props.shiori.id}`
  }
  return `/s/${props.shiori.id}`
})

/** 公開/非公開を切り替え */
async function togglePublic(value: boolean) {
  toggling.value = true
  try {
    await authFetch(`/api/shiori/${props.shiori.id}`, {
      method: 'PUT',
      body: { is_public: value },
    })
    isPublic.value = value
    emit('updated', value)
    toast.add({
      title: value ? 'しおりを公開しました' : 'しおりを非公開にしました',
      color: 'success',
    })
  }
  catch {
    // 失敗時は元に戻す
    isPublic.value = !value
    toast.add({ title: '設定の変更に失敗しました', color: 'error' })
  }
  finally {
    toggling.value = false
  }
}

/** URLをクリップボードにコピー */
function copyUrl() {
  copy(shareUrl.value)
  toast.add({ title: 'URLをコピーしました', color: 'success' })
}
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-share-2" class="size-5 text-orange-500" />
        <span class="font-semibold">共有設定</span>
      </div>
    </template>

    <template #body>
      <div class="space-y-5">
        <!-- 公開トグル -->
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-stone-900 dark:text-stone-50">
              リンクで公開
            </p>
            <p class="mt-0.5 text-sm text-stone-500">
              URLを知っている人なら誰でも閲覧できます
            </p>
          </div>
          <USwitch
            :model-value="isPublic"
            :disabled="toggling"
            @update:model-value="togglePublic"
          />
        </div>

        <!-- 共有URL（公開時のみ表示） -->
        <div v-if="isPublic" class="space-y-3">
          <div class="flex items-center gap-2">
            <UInput
              :model-value="shareUrl"
              readonly
              class="flex-1"
              icon="i-lucide-link"
            />
            <UButton
              :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
              :variant="copied ? 'soft' : 'solid'"
              @click="copyUrl"
            >
              {{ copied ? 'コピー済み' : 'コピー' }}
            </UButton>
          </div>
          <p class="text-xs text-stone-400">
            ログインなしで閲覧専用ページとして表示されます
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end">
        <UButton variant="ghost" @click="isOpen = false">
          閉じる
        </UButton>
      </div>
    </template>
  </UModal>
</template>
