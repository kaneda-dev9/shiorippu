<template>
  <div>
    <!-- ユーザーメッセージ -->
    <template v-if="message.role === 'user'">
      <template v-for="(part, index) in message.parts" :key="`${message.id}-${index}`">
        <p v-if="isTextUIPart(part)" class="whitespace-pre-wrap">{{ part.text }}</p>
      </template>
    </template>

    <!-- アシスタントメッセージ -->
    <template v-else>
      <!-- パーツイテレーション -->
      <template v-for="(part, index) in message.parts" :key="`${message.id}-${index}`">
        <!-- 推論 -->
        <UChatReasoning
          v-if="isReasoningUIPart(part)"
          :text="part.text"
          :streaming="checkReasoningStreaming(index)"
          icon="i-lucide-brain"
        />

        <!-- ツール呼び出し（ツール名ごとに1行のみ表示） -->
        <UChatTool
          v-else-if="toolDisplayMap.get(index)"
          :text="toolDisplayMap.get(index)!.label"
          :streaming="toolDisplayMap.get(index)!.streaming"
          :icon="toolDisplayMap.get(index)!.icon"
        />

        <!-- テキスト -->
        <template v-else-if="isTextUIPart(part) && processedTexts.get(index)">
          <div
            class="chat-markdown"
            v-html="renderMd(processedTexts.get(index)!)"
          />
        </template>
      </template>

      <!-- 複数選択インジケーター -->
      <p
        v-if="showMultiSelectHint"
        class="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400"
      >
        * 複数選択できます
      </p>

      <!-- プラン生成中インジケーター -->
      <div
        v-if="showPlanGenerating"
        class="mt-3 overflow-hidden rounded-xl border border-amber-200 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-900/10"
      >
        <div class="flex items-center gap-2 border-b border-amber-200 bg-amber-100/50 px-4 py-2.5 dark:border-amber-800/50 dark:bg-amber-900/20">
          <UIcon name="i-lucide-map" class="size-4 text-amber-700 dark:text-amber-400" />
          <span class="text-sm font-semibold text-amber-700 dark:text-amber-300">旅行プラン</span>
        </div>
        <div class="px-4 py-5">
          <div class="flex items-center gap-3">
            <div class="relative flex size-10 items-center justify-center">
              <span class="absolute inline-flex size-full animate-ping rounded-full bg-amber-300 opacity-30" />
              <span class="relative flex size-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <UIcon name="i-lucide-pen-line" class="size-4 text-amber-700 dark:text-amber-400" />
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
          <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-amber-100 dark:bg-amber-900/30">
            <div class="h-full animate-pulse rounded-full bg-gradient-to-r from-amber-400 via-pink-400 to-amber-400" style="width: 60%; animation-duration: 1.5s;" />
          </div>
        </div>
      </div>

      <!-- プランプレビュー（完了後） -->
      <SectionChatPlanPreview
        v-if="plan && !showPlanGenerating"
        :plan="plan"
        :shiori-id="shioriId"
        :applied="appliedPlanIds.has(message.id)"
        @apply-plan="handleApplyPlan"
      />

      <!-- 選択肢カード -->
      <SectionChatChoiceCards
        v-if="choiceCards.length > 0 && isLast && !isStreaming"
        class="mt-3"
        :choices="choiceCards"
        :single-select="singleSelect"
        @send="handleSend"
      />

      <!-- クイックリプライ -->
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
import type { UIMessage, ChatStatus } from 'ai'
import { isTextUIPart, isToolUIPart, isReasoningUIPart, getToolName } from 'ai'
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
  getQuickReplies,
  TOOL_CONFIG,
} from '~~/app/utils/chatHelpers'

const props = defineProps<{
  message: UIMessage
  isLast: boolean
  status: ChatStatus
  appliedPlanIds: Set<string>
  shioriId: string
  choiceCards: ChoiceCard[]
  singleSelect: boolean
}>()

const emit = defineEmits<{
  applyPlan: [plan: TripPlan, messageId: string]
  send: [text: string]
}>()

/** isStreaming を status から導出 */
const isStreaming = computed<boolean>(() =>
  props.status === 'streaming' || props.status === 'submitted',
)

/** メッセージのテキスト全文 */
const fullText = computed<string>(() => getFullText(props.message))

/** プラン抽出結果 */
const plan = computed<TripPlan | null>(() => extractPlan(fullText.value))

/** プラン生成中かどうか */
const planGenerating = computed<boolean>(() => isPlanStreaming(fullText.value))

/** ストリーミング中 & 最後のメッセージ & プラン生成中 */
const showPlanGenerating = computed<boolean>(() =>
  props.isLast && isStreaming.value && planGenerating.value,
)

/** ストリーミング中のイベントカウント */
const streamingEventCount = computed<number>(() => countStreamingEvents(fullText.value))

/** 選択肢リストを除去すべきか */
const shouldStripChoiceList = computed<boolean>(() =>
  props.choiceCards.length > 0 && props.isLast && !isStreaming.value,
)

/** 最後のテキストパーツの index */
const lastTextPartIdx = computed<number>(() => {
  for (let i = props.message.parts.length - 1; i >= 0; i--) {
    if (isTextUIPart(props.message.parts[i]!)) return i
  }
  return -1
})

/** 指定 index が最後のテキストパーツかどうか */
function isLastTextPartIndex(index: number): boolean {
  return index === lastTextPartIdx.value
}

/** パーツindex → 処理済みテキストの Map（computed キャッシュ） */
const processedTexts = computed(() => {
  const map = new Map<number, string>()
  for (let i = 0; i < props.message.parts.length; i++) {
    const part = props.message.parts[i]!
    if (!isTextUIPart(part)) continue
    let text = getTextWithoutPlan(part.text)
    if (shouldStripChoiceList.value && isLastTextPartIndex(i)) {
      text = getMessageBody(text)
    }
    map.set(i, text.trim())
  }
  return map
})

/** 複数選択ヒントを表示するか */
const showMultiSelectHint = computed<boolean>(() =>
  props.isLast
  && !isStreaming.value
  && props.choiceCards.length > 0
  && !isSingleSelectMessage(fullText.value),
)

/** クイックリプライ（確認メッセージ用） */
const quickReplies = computed<string[]>(() => getQuickReplies(fullText.value))

/** 推論パートがストリーミング中か */
function checkReasoningStreaming(partIndex: number): boolean {
  if (!props.isLast || props.status !== 'streaming') return false
  // このパーツ以降に異なるタイプのパーツがなければストリーミング中
  const partType = props.message.parts[partIndex]!.type
  for (let i = partIndex + 1; i < props.message.parts.length; i++) {
    if (props.message.parts[i]!.type !== partType) return false
  }
  return true
}

/** ツール表示情報（index キー: 表示対象パーツのみ） */
interface ToolDisplayInfo {
  streaming: boolean
  label: string
  icon: string
}

type ToolPartRef = Parameters<typeof getToolName>[0]
const TERMINAL_STATES = ['output-available', 'output-error', 'output-denied']

/**
 * ツール名ごとに重複排除した表示情報（index → 表示情報の Map）
 * - 同一ツール名の最初の出現 index のみエントリを持つ
 * - streaming: そのツール名のいずれかの呼び出しが実行中なら true
 * - label/icon: TOOL_CONFIG から取得済み
 */
const toolDisplayMap = computed(() => {
  const nameToIndex = new Map<string, number>()
  const result = new Map<number, ToolDisplayInfo>()

  for (let i = 0; i < props.message.parts.length; i++) {
    const part = props.message.parts[i]!
    if (!isToolUIPart(part)) continue
    const name = getToolName(part as ToolPartRef)
    const partStreaming = !TERMINAL_STATES.includes((part as { state: string }).state)
    const config = TOOL_CONFIG[name]

    const existingIdx = nameToIndex.get(name)
    if (existingIdx === undefined) {
      nameToIndex.set(name, i)
      result.set(i, {
        streaming: partStreaming,
        label: config?.label ?? name,
        icon: config?.icon ?? 'i-lucide-wrench',
      })
    }
    else if (partStreaming) {
      result.get(existingIdx)!.streaming = true
    }
  }
  return result
})

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
