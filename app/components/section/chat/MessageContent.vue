<template>
  <div>
    <!-- ユーザーメッセージ -->
    <template v-if="message.role === 'user'">
      <div class="whitespace-pre-wrap">
        {{ fullText }}
      </div>
    </template>

    <!-- アシスタントメッセージ -->
    <template v-else>
      <!-- メッセージ本文 -->
      <div
        v-if="displayText"
        class="chat-markdown"
        v-html="renderedHtml"
      />

      <!-- 複数選択インジケーター -->
      <p
        v-if="showMultiSelectHint"
        class="mt-2 text-xs font-medium text-orange-500"
      >
        * 複数選択できます
      </p>

      <!-- ストリーミング中のカーソル（プラン生成中・ツール実行中は非表示） -->
      <span
        v-if="showStreamingCursor"
        class="inline-block h-4 w-0.5 animate-pulse bg-stone-400"
      />

      <!-- ツール使用中インジケーター -->
      <SectionChatToolIndicator
        v-if="isLast && isStreaming && toolActivityLabel"
        :label="toolActivityLabel"
      />

      <!-- プラン生成中インジケーター -->
      <div
        v-if="showPlanGenerating"
        class="mt-3 overflow-hidden rounded-xl border border-orange-200 bg-orange-50/50 dark:border-orange-800/50 dark:bg-orange-900/10"
      >
        <div class="flex items-center gap-2 border-b border-orange-200 bg-orange-100/50 px-4 py-2.5 dark:border-orange-800/50 dark:bg-orange-900/20">
          <UIcon name="i-lucide-map" class="size-4 text-orange-500" />
          <span class="text-sm font-semibold text-orange-700 dark:text-orange-300">旅行プラン</span>
        </div>
        <div class="px-4 py-5">
          <div class="flex items-center gap-3">
            <div class="relative flex size-10 items-center justify-center">
              <span class="absolute inline-flex size-full animate-ping rounded-full bg-orange-300 opacity-30" />
              <span class="relative flex size-8 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
                <UIcon name="i-lucide-wand-sparkles" class="size-4 text-orange-500" />
              </span>
            </div>
            <div>
              <p class="text-sm font-medium text-stone-700 dark:text-stone-200">
                プランを作成しています…
              </p>
              <p class="mt-0.5 text-xs text-stone-400">
                {{ streamingEventCount }}件のイベントを生成中
              </p>
            </div>
          </div>
          <!-- プログレスバー -->
          <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-orange-100 dark:bg-orange-900/30">
            <div class="h-full animate-pulse rounded-full bg-gradient-to-r from-orange-400 via-pink-400 to-orange-400" style="width: 60%; animation-duration: 1.5s;" />
          </div>
        </div>
      </div>

      <!-- プランプレビュー（完了後） -->
      <SectionChatPlanPreview
        v-if="plan && !showPlanGenerating"
        :plan="plan"
        :shiori-id="shioriId"
        :applied="appliedPlanIds.has(message.id)"
        @apply="handleApplyPlan"
      />

      <!-- 選択肢カード（最後のアシスタントメッセージの後にインライン表示） -->
      <SectionChatChoiceCards
        v-if="choiceCards.length > 0 && isLast && !isStreaming"
        class="mt-3"
        :choices="choiceCards"
        :single-select="singleSelect"
        @send="handleSend"
      />

      <!-- クイックリプライ（確認メッセージ時） -->
      <div
        v-if="quickReplies.length > 0 && choiceCards.length === 0 && isLast && !isStreaming"
        class="mt-3 flex flex-wrap gap-2"
      >
        <UButton
          v-for="reply in quickReplies"
          :key="reply"
          variant="outline"
          size="sm"
          @click="emit('send', reply)"
        >
          {{ reply }}
        </UButton>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { UIMessage } from 'ai'
import type { TripPlan } from '~~/types/database'
import type { ChoiceCard } from '~~/app/utils/chatHelpers'
import {
  renderMd,
  getFullText,
  getTextWithoutPlan,
  getMessageBody,
  extractPlan,
  isPlanStreaming,
  countStreamingEvents,
  isSingleSelectMessage,
  getToolActivity,
  getQuickReplies,
} from '~~/app/utils/chatHelpers'

const props = defineProps<{
  message: UIMessage
  isLast: boolean
  isStreaming: boolean
  appliedPlanIds: Set<string>
  shioriId: string
  choiceCards: ChoiceCard[]
  singleSelect: boolean
}>()

const emit = defineEmits<{
  applyPlan: [plan: TripPlan, messageId: string]
  send: [text: string]
}>()

/** メッセージのテキスト全文 */
const fullText = computed<string>(() => getFullText(props.message))

/** プラン抽出結果 */
const plan = computed<TripPlan | null>(() => extractPlan(fullText.value))

/** プラン生成中かどうか */
const planGenerating = computed<boolean>(() => isPlanStreaming(fullText.value))

/** ストリーミング中 & 最後のメッセージ & プラン生成中 */
const showPlanGenerating = computed<boolean>(() =>
  props.isLast && props.isStreaming && planGenerating.value,
)

/** ストリーミング中のイベントカウント */
const streamingEventCount = computed<number>(() => countStreamingEvents(fullText.value))

/** 表示するテキスト（PLAN_JSON除去） */
const displayText = computed<string>(() => {
  const textWithoutPlan = getTextWithoutPlan(fullText.value)
  // 選択肢がある場合は本文のみ
  if (props.choiceCards.length > 0 && props.isLast && !props.isStreaming) {
    return getMessageBody(textWithoutPlan)
  }
  return textWithoutPlan
})

/** レンダリング済みHTML */
const renderedHtml = computed<string>(() => renderMd(displayText.value))

/** 複数選択ヒントを表示するか */
const showMultiSelectHint = computed<boolean>(() =>
  props.isLast
  && !props.isStreaming
  && props.choiceCards.length > 0
  && !isSingleSelectMessage(fullText.value),
)

/** ツール使用中のラベル（リアルタイム） */
const realtimeToolLabel = computed<string | null>(() => getToolActivity(props.message))

/**
 * 表示用ツールラベル: ツール完了後もテキストが再開するまで維持する
 * AI SDK ではツール状態遷移が高速なため、computed だけでは一瞬で消える
 */
const stickyToolLabel = ref<string | null>(null)
const lastTextLength = ref<number>(0)

watch(realtimeToolLabel, (label) => {
  if (label) stickyToolLabel.value = label
})

// テキストが増えたらツールラベルをクリア（テキストストリーミング再開）
watch(fullText, (text) => {
  if (text.length > lastTextLength.value && stickyToolLabel.value) {
    stickyToolLabel.value = null
  }
  lastTextLength.value = text.length
})

// ストリーミング終了時にクリア
watch(() => props.isStreaming, (streaming) => {
  if (!streaming) stickyToolLabel.value = null
})

/** 表示するツールラベル */
const toolActivityLabel = computed<string | null>(() => realtimeToolLabel.value || stickyToolLabel.value)

/** ストリーミングカーソルを表示するか（プラン生成中・ツール実行中は非表示） */
const showStreamingCursor = computed<boolean>(() =>
  props.isLast && props.isStreaming && !planGenerating.value && !toolActivityLabel.value && props.message.role === 'assistant',
)

/** クイックリプライ（確認メッセージ用） */
const quickReplies = computed<string[]>(() => getQuickReplies(fullText.value))

/** プラン適用ハンドラ */
function handleApplyPlan(plan: TripPlan) {
  emit('applyPlan', plan, props.message.id)
}

/** 送信ハンドラ */
function handleSend(text: string) {
  emit('send', text)
}
</script>

<style scoped>
.chat-markdown :deep(p) {
  margin-bottom: 0.5em;
}
.chat-markdown :deep(p:last-child) {
  margin-bottom: 0;
}
.chat-markdown :deep(strong) {
  font-weight: 700;
}
.chat-markdown :deep(ol) {
  list-style: decimal;
  padding-left: 1.5em;
  margin-bottom: 0.5em;
}
.chat-markdown :deep(ul) {
  list-style: disc;
  padding-left: 1.5em;
  margin-bottom: 0.5em;
}
.chat-markdown :deep(li) {
  margin-bottom: 0.25em;
}
.chat-markdown :deep(a) {
  text-decoration: underline;
}
</style>
