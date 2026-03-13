<template>
  <!-- Googleカレンダーエクスポートボタン -->
  <UButton
    icon="i-lucide-calendar-plus"
    :variant="variant"
    :size="size"
    :loading="exporting"
    @click="onClickExport"
  >
    <slot>
      <span class="hidden sm:inline">カレンダー</span>
    </slot>
  </UButton>

  <!-- エクスポート確認モーダル（初回 or 既存なし） -->
  <AtomsConfirmModal
    v-model:show="showConfirm"
    title="Googleカレンダーにエクスポート"
    description="しおりのイベントをGoogleカレンダーに追加しますか？"
    confirm-label="追加する"
    :loading="exporting"
    @confirm="handleConfirmExport"
  />

  <!-- 既存イベント検出モーダル -->
  <!-- nuxt-ui-direct: UModal はアクション選択UIに最適 -->
  <UModal
    v-model:open="showExistingModal"
    title="エクスポート済みのイベントがあります"
    :ui="{ content: 'sm:max-w-md' }"
  >
    <template #body>
      <div class="space-y-3">
        <!-- 既存エクスポート済みイベントの警告 -->
        <div v-if="existingInfo?.count" class="flex items-center gap-3 rounded-lg bg-orange-50 p-3 dark:bg-orange-900/20">
          <UIcon name="i-lucide-alert-triangle" class="size-5 shrink-0 text-orange-500" />
          <div class="text-sm">
            <p class="font-medium text-stone-900 dark:text-stone-50">
              Googleカレンダーに {{ existingInfo.count }}件のイベントが既にエクスポート済みです
            </p>
            <p v-if="existingInfo.lastExportedAt" class="mt-0.5 text-stone-500">
              前回エクスポート: {{ formatDate(existingInfo.lastExportedAt) }}
            </p>
          </div>
        </div>

        <!-- コンフリクト（旅行期間中の既存予定）の警告 -->
        <div v-if="existingInfo?.conflicts?.length" class="rounded-lg border border-stone-200 p-3 dark:border-stone-700">
          <div class="mb-2 flex items-center gap-2 text-sm font-medium text-stone-900 dark:text-stone-50">
            <UIcon name="i-lucide-calendar-clock" class="size-4 text-stone-500" />
            旅行期間中に {{ existingInfo.conflicts.length }}件の予定があります
          </div>
          <ul class="space-y-1 text-xs text-stone-500">
            <li
              v-for="(c, i) in existingInfo.conflicts.slice(0, 5)"
              :key="i"
              class="flex items-center gap-2"
            >
              <span class="shrink-0 tabular-nums text-stone-400">{{ c.date }}</span>
              <span v-if="c.startTime" class="shrink-0 tabular-nums text-stone-400">
                {{ c.startTime }}<template v-if="c.endTime">-{{ c.endTime }}</template>
              </span>
              <span class="truncate">{{ c.summary }}</span>
            </li>
            <li v-if="existingInfo.conflicts.length > 5" class="text-stone-400">
              ...他 {{ existingInfo.conflicts.length - 5 }}件
            </li>
          </ul>
        </div>

        <p class="text-xs text-stone-400">
          どのようにエクスポートしますか？
        </p>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
        <UButton variant="ghost" @click="showExistingModal = false">
          キャンセル
        </UButton>
        <!-- エクスポート済みイベントがある場合: 新規のみ / 上書き -->
        <template v-if="existingInfo?.count">
          <UButton
            variant="outline"
            icon="i-lucide-plus"
            :loading="exporting"
            @click="handleExportWithMode('add_new')"
          >
            新規のみ追加
          </UButton>
          <UButton
            icon="i-lucide-refresh-cw"
            :loading="exporting"
            @click="handleExportWithMode('overwrite')"
          >
            すべて上書き
          </UButton>
        </template>
        <!-- コンフリクトのみ（初回エクスポート）: 追加する -->
        <UButton
          v-else
          icon="i-lucide-calendar-plus"
          :loading="exporting"
          @click="handleExportWithMode('add_new')"
        >
          追加する
        </UButton>
      </div>
    </template>
  </UModal>

  <!-- Google認証モーダル -->
  <!-- nuxt-ui-direct: UModal は認証フローの案内に最適 -->
  <UModal
    v-model:open="needsAuth"
    title="Googleカレンダーに接続"
    :ui="{ content: 'sm:max-w-md' }"
  >
    <template #body>
      <div class="space-y-4 text-center">
        <div class="mx-auto flex size-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
          <UIcon name="i-lucide-calendar-plus" class="size-8 text-orange-500" />
        </div>
        <div>
          <p class="font-medium text-stone-900 dark:text-stone-50">
            Googleカレンダーとの連携が必要です
          </p>
          <p class="mt-1 text-sm text-stone-500">
            Googleアカウントで認証して、カレンダーへのアクセスを許可してください。
          </p>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full items-center justify-between">
        <UButton variant="ghost" @click="needsAuth = false">
          キャンセル
        </UButton>
        <UButton
          icon="i-lucide-log-in"
          @click="handleConnect"
        >
          Googleカレンダーに接続
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'

const props = defineProps<{
  shioriId: string
  startDate?: string | null
  variant?: 'solid' | 'outline' | 'soft' | 'subtle' | 'ghost' | 'link'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}>()

const toast = useToast()
const {
  exporting,
  needsAuth,
  existingInfo,
  checkBeforeExport,
  exportWithMode,
  connectGoogleCalendar,
} = useCalendarExport()

const showConfirm = ref<boolean>(false)
const showExistingModal = ref<boolean>(false)

function formatDate(dateStr: string): string {
  return dayjs(dateStr).format('YYYY/MM/DD HH:mm')
}

async function onClickExport() {
  if (!props.startDate) {
    toast.add({ title: '日程を設定してからエクスポートしてください', color: 'warning' })
    return
  }

  // まず既存・コンフリクトチェック
  const result = await checkBeforeExport(props.shioriId)
  if (result === 'has_existing') {
    showExistingModal.value = true
  }
  else if (result === 'ok') {
    // 問題なし → 確認ダイアログ表示
    showConfirm.value = true
  }
  // 'needs_auth' / 'error' は composable 側で処理済み
}

async function handleConfirmExport() {
  showConfirm.value = false
  await exportWithMode(props.shioriId, 'add_new')
}

async function handleExportWithMode(mode: 'add_new' | 'overwrite') {
  showExistingModal.value = false
  await exportWithMode(props.shioriId, mode)
}

function handleConnect() {
  const currentPath = `/shiori/${props.shioriId}`
  connectGoogleCalendar(currentPath)
}
</script>
