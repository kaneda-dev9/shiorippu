<template>
  <!-- PDF生成ボタン -->
  <UButton
    icon="i-lucide-file-down"
    :variant="variant"
    :size="size"
    :loading="generating"
    @click="onGenerate"
  >
    <slot>
      PDF
    </slot>
  </UButton>

  <!-- プレビューモーダル -->
  <!-- nuxt-ui-direct: UModal はフルスクリーンプレビューに最適 -->
  <UModal
    v-model:open="showPreview"
    title="PDFプレビュー"
    :ui="{ content: 'sm:max-w-4xl sm:h-[90vh]', body: 'flex-1 p-0 overflow-hidden' }"
    @close="onClose"
  >
    <template #body>
      <iframe
        v-if="previewUrl"
        :src="previewUrl"
        class="size-full border-0"
        title="PDFプレビュー"
      />
      <div v-else class="flex size-full items-center justify-center">
        <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-amber-700 dark:text-amber-400" />
      </div>
    </template>
    <template #footer>
      <div class="flex w-full items-center justify-between">
        <UButton variant="ghost" @click="showPreview = false">
          閉じる
        </UButton>
        <UButton
          icon="i-lucide-download"
          @click="downloadPdf"
        >
          ダウンロード
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { ShioriWithDays } from '~~/types/database'

const props = defineProps<{
  shiori: ShioriWithDays
  variant?: 'solid' | 'outline' | 'soft' | 'subtle' | 'ghost' | 'link'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}>()

const { generating, previewUrl, generatePreview, downloadPdf, revokePreview } = usePdfExport()
const showPreview = ref<boolean>(false)

async function onGenerate() {
  showPreview.value = true
  await generatePreview(props.shiori)
}

function onClose() {
  revokePreview()
}
</script>
