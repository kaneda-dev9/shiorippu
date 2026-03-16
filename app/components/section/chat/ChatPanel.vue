<template>
  <div class="flex h-full flex-col">
    <!-- ヘッダー -->
    <div class="flex items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-stone-700">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-sparkles" class="size-5 text-orange-500" />
        <span class="font-semibold text-stone-900 dark:text-stone-50">AI旅行プランナー</span>
      </div>
      <UButton
        icon="i-lucide-x"
        variant="ghost"
        size="xs"
        aria-label="閉じる"
        @click="emit('close')"
      />
    </div>

    <!-- メッセージエリア -->
    <SectionChatWelcome
      v-if="messages.length === 0"
      class="min-h-0 flex-1 overflow-y-auto px-4"
      @send="handleSend"
    />

    <div v-else ref="chatScrollContainer" class="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <!-- 折りたたみボタン -->
      <div v-if="hiddenCount > 0" class="flex justify-center px-4 py-2">
        <UButton
          icon="i-lucide-chevrons-up"
          variant="soft"
          color="neutral"
          size="xs"
          class="rounded-full"
          @click="showAllMessages = true"
        >
          {{ hiddenCount }}件の古いメッセージを表示
        </UButton>
      </div>
      <div v-if="showAllMessages && messages.length > VISIBLE_COUNT" class="flex justify-center px-4 py-2">
        <UButton
          icon="i-lucide-chevrons-down"
          variant="soft"
          color="neutral"
          size="xs"
          class="rounded-full"
          @click="showAllMessages = false"
        >
          古いメッセージを折りたたむ
        </UButton>
      </div>

      <UChatMessages
        ref="chatMessages"
        :messages="visibleMessages"
        :status="status"
        should-auto-scroll
        :user="userProps"
        :assistant="assistantProps"
        class="text-sm"
        :auto-scroll="false"
        :ui="{
          root: 'w-full flex flex-col gap-1 flex-1 px-4',
        }"
      >
        <!-- メッセージ本文カスタム描画 -->
      <template #content="{ message }">
        <SectionChatMessageContent
          :message="message"
          :is-last="message.id === lastMessageId"
          :is-streaming="status === 'streaming' || status === 'submitted'"
          :applied-plan-ids="appliedPlanIds"
          :shiori-id="props.shioriId"
          :choice-cards="message.id === lastMessageId ? choiceCards : []"
          :single-select="isSingleSelect"
          @apply-plan="handleApplyPlan"
          @send="handleSend"
        />
      </template>
      </UChatMessages>
    </div>

    <!-- 入力エリア -->
    <div class="relative border-t border-stone-200 px-4 py-3 dark:border-stone-700">
      <!-- フローティング「最新へ」ボタン -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="translate-y-2 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="translate-y-2 opacity-0"
      >
        <UButton
          v-if="!isNearBottom && messages.length > 0"
          icon="i-lucide-arrow-down"
          variant="outline"
          color="neutral"
          size="xs"
          class="absolute -top-10 right-4 z-10 rounded-full shadow-lg"
          @click="scrollToBottom"
        >
          最新へ
        </UButton>
      </Transition>
      <div class="flex items-end gap-2">
        <UTextarea
          v-model="inputText"
          placeholder="メッセージを入力…"
          :rows="1"
          autoresize
          :maxrows="4"
          class="flex-1"
          :disabled="status === 'streaming' || status === 'submitted'"
          @keydown="handleKeydown"
        />
        <UChatPromptSubmit
          :status="status"
          @click="handleSubmitClick"
          @stop="stopStreaming"
        />
      </div>
      <!-- ヘルパーテキスト -->
      <div class="mt-2 flex items-center justify-center gap-1.5 text-xs text-stone-400">
        <UIcon name="i-lucide-sparkles" class="size-3 text-orange-400" />
        <span>AIが質問に合わせて選択肢を提案します。「その他」で自由に入力もできます</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UIMessage } from 'ai'
import type { TripPlan } from '~~/types/database'
import type { ChoiceCard } from '~~/app/utils/chatHelpers'
import {
  getFullText,
  parseChoiceCards,
  isSingleSelectMessage,
} from '~~/app/utils/chatHelpers'

const props = defineProps<{
  shioriId: string
}>()

const emit = defineEmits<{
  close: []
  'plan-applied': []
}>()

const { authFetch } = useAuthFetch()
const toast = useToast()

// チャットストリーム
const {
  messages,
  status,
  sendMessage,
  stopStreaming,
  loadHistory,
} = useChatStream(props.shioriId)

// プラン適用済みメッセージIDの管理
const appliedPlanIds = ref<Set<string>>(new Set())
const inputText = ref<string>('')

// メッセージ折りたたみ
const VISIBLE_COUNT = 6
const showAllMessages = ref<boolean>(false)

const visibleMessages = computed<UIMessage[]>(() => {
  if (showAllMessages.value || messages.value.length <= VISIBLE_COUNT) {
    return messages.value
  }
  return messages.value.slice(-VISIBLE_COUNT)
})

const hiddenCount = computed<number>(() => {
  if (showAllMessages.value || messages.value.length <= VISIBLE_COUNT) return 0
  return messages.value.length - VISIBLE_COUNT
})

// スクロール制御: ラッパー要素を参照
const scrollContainer = useTemplateRef<HTMLElement>('chatScrollContainer')
const { arrivedState } = useScroll(scrollContainer, { offset: { bottom: 80 } })
const isNearBottom = computed<boolean>(() => arrivedState.bottom)

function scrollToBottom() {
  const el = scrollContainer.value
  if (el) {
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }
}

// ユーザー/アシスタントのメッセージ表示設定
const userProps = {
  side: 'right' as const,
  variant: 'soft' as const,
  icon: 'i-lucide-user',
}
const assistantProps = {
  side: 'left' as const,
  variant: 'naked' as const,
  avatar: { icon: 'i-lucide-bot' },
}

/** 最後のメッセージID */
const lastMessageId = computed<string | null>(() => {
  const last = messages.value[messages.value.length - 1]
  return last?.id ?? null
})

/** 最後のアシスタントメッセージ */
const lastAssistantMessage = computed<UIMessage | null>(() => {
  const last = messages.value[messages.value.length - 1]
  return last?.role === 'assistant' ? last : null
})

/** 選択肢カード */
const choiceCards = computed<ChoiceCard[]>(() => {
  if (status.value !== 'ready' || !lastAssistantMessage.value) return []
  const text = getFullText(lastAssistantMessage.value)
  return parseChoiceCards(text)
})

/** 単一選択モードか */
const isSingleSelect = computed<boolean>(() => {
  if (!lastAssistantMessage.value) return false
  return isSingleSelectMessage(getFullText(lastAssistantMessage.value))
})

/** メッセージ送信 */
async function handleSend(text: string) {
  inputText.value = ''
  await sendMessage(text)
}

/** 送信ボタンクリック */
function handleSubmitClick() {
  if (status.value !== 'ready' || !inputText.value.trim()) return
  handleSend(inputText.value)
}

/** Enter キーで送信（Shift+Enter は改行、IME変換中は無視） */
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    if (inputText.value.trim()) {
      handleSend(inputText.value)
    }
  }
}

/** プランをしおりに適用 */
async function handleApplyPlan(plan: TripPlan, messageId: string) {
  try {
    await authFetch(`/api/shiori/${props.shioriId}/apply-plan`, {
      method: 'POST',
      body: { plan },
    })
    appliedPlanIds.value.add(messageId)
    toast.add({ title: 'プランをしおりに適用しました！', color: 'success', icon: 'i-lucide-check-circle' })
    emit('plan-applied')
  }
  catch {
    toast.add({ title: 'プランの適用に失敗しました', color: 'error' })
  }
}

onMounted(loadHistory)
</script>
