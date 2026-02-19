<script setup lang="ts">
import { marked } from 'marked'
import type { TripPlan } from '~~/types/database'

marked.setOptions({ breaks: true, gfm: true })

interface ChoiceCard {
  emoji: string
  label: string
  description: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const props = defineProps<{
  shioriId: string
}>()

const emit = defineEmits<{
  close: []
  'plan-applied': []
}>()

const { authFetch } = useAuthFetch()
const toast = useToast()

// プラン適用済みメッセージのインデックスを管理
const appliedPlanIndices = ref<Set<number>>(new Set())

const messages = ref<ChatMessage[]>([])
const inputText = ref('')
const isStreaming = ref(false)
const chatContainer = ref<HTMLElement>()
const selectedReplies = ref<Set<string>>(new Set())
const showOtherInput = ref(false)
const otherInputText = ref('')

// 折りたたみ
const showAllMessages = ref(false)
const VISIBLE_COUNT = 6

const visibleMessages = computed(() => {
  if (showAllMessages.value || messages.value.length <= VISIBLE_COUNT) {
    return messages.value
  }
  return messages.value.slice(-VISIBLE_COUNT)
})

const hiddenCount = computed(() => {
  if (showAllMessages.value || messages.value.length <= VISIBLE_COUNT) return 0
  return messages.value.length - VISIBLE_COUNT
})

/** visibleMessages のローカルインデックスを messages のグローバルインデックスに変換 */
function toGlobalIndex(localIndex: number): number {
  if (showAllMessages.value || messages.value.length <= VISIBLE_COUNT) {
    return localIndex
  }
  return messages.value.length - VISIBLE_COUNT + localIndex
}

// スクロール位置追跡（VueUse useScroll で確実に検出）
const { arrivedState } = useScroll(chatContainer, {
  offset: { bottom: 100 },
})
const isNearBottom = computed(() => arrivedState.bottom)
const newMessageCount = ref(0)

watch(isNearBottom, (val) => {
  if (val) newMessageCount.value = 0
})

/** マークダウンをHTMLに変換 */
function renderMd(text: string): string {
  return marked.parse(text, { async: false }) as string
}

/** メッセージからPLAN_JSONを抽出 */
function extractPlan(content: string): TripPlan | null {
  const match = content.match(/<PLAN_JSON>([\s\S]*?)<\/PLAN_JSON>/)
  if (!match?.[1]) return null
  try {
    const parsed = JSON.parse(match[1])
    if (parsed?.days?.length > 0) return parsed as TripPlan
  }
  catch {
    // JSONパース失敗
  }
  return null
}

/** ストリーミング中にプランJSON生成中かどうかを判定 */
function isPlanStreaming(content: string): boolean {
  return content.includes('<PLAN_JSON>') && !content.includes('</PLAN_JSON>')
}

/** ストリーミング中の不完全JSONからイベント数をカウント */
function countStreamingEvents(content: string): number {
  const planStart = content.indexOf('<PLAN_JSON>')
  if (planStart === -1) return 0
  const partial = content.slice(planStart)
  return (partial.match(/"title"\s*:/g) || []).length
}

/** メッセージからPLAN_JSONタグを除去したテキストを返す（ストリーミング中の不完全タグにも対応） */
function getTextWithoutPlan(content: string): string {
  // 完全なタグを除去
  let text = content.replace(/<PLAN_JSON>[\s\S]*?<\/PLAN_JSON>/, '')
  // 未完了の開きタグ以降を除去（ストリーミング中、閉じタグがまだ来ていない場合）
  text = text.replace(/<PLAN_JSON>[\s\S]*$/, '')
  return text.trim()
}

/** プランをしおりに適用 */
async function applyPlan(plan: TripPlan, messageIndex: number) {
  try {
    await authFetch(`/api/shiori/${props.shioriId}/apply-plan`, {
      method: 'POST',
      body: { plan },
    })
    appliedPlanIndices.value.add(messageIndex)
    toast.add({ title: 'プランをしおりに適用しました！', color: 'success', icon: 'i-lucide-check-circle' })
    emit('plan-applied')
  }
  catch {
    toast.add({ title: 'プランの適用に失敗しました', color: 'error' })
  }
}

/**
 * AIメッセージの本文部分（選択肢リストを除外）を取得
 * 「1. 」で始まる番号付きリスト以降を除去して本文のみ返す
 */
function getMessageBody(content: string): string {
  const lines = content.split('\n')
  const bodyLines: string[] = []
  for (const line of lines) {
    // 番号付き選択肢リストの開始を検出（「1. 」で始まる行）
    if (/^\s*1\.\s/.test(line)) break
    bodyLines.push(line)
  }
  // 末尾の空行を除去
  while (bodyLines.length > 0 && (bodyLines[bodyLines.length - 1] || '').trim() === '') {
    bodyLines.pop()
  }
  return bodyLines.join('\n')
}

/**
 * AIの回答から選択肢カードを抽出する
 * 様々なフォーマットに対応:
 * - 「1. **ラベル**」「1. **ラベル**（説明）」
 * - 「1. ラベル」（太字なし）
 * - 説明は同じ行の括弧内、次の行の「- 」「• 」、インデントされた行
 */
const choiceCards = computed<ChoiceCard[]>(() => {
  if (isStreaming.value || messages.value.length === 0) return []

  const lastMsg = messages.value[messages.value.length - 1]
  if (!lastMsg || lastMsg.role !== 'assistant') return []

  const choices: ChoiceCard[] = []
  const lines = lastMsg.content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] || '').trim()

    // 番号付きリストの行を検出: 「1. 」「1.」で始まる
    const numberedMatch = line.match(/^\d+\.\s+(.+)$/)
    if (!numberedMatch?.[1]) continue

    const restOfLine = numberedMatch[1]

    // ラベルを抽出: まず **太字** を探す、なければテキスト全体
    let label = ''
    const boldMatch = restOfLine.match(/\*\*(.+?)\*\*/)
    if (boldMatch?.[1]) {
      label = boldMatch[1].trim()
    }
    else {
      // 太字マーカーがない場合: 括弧以前のテキスト全体をラベルに
      const plainLabel = restOfLine.replace(/[（(].+?[）)]/, '').trim()
      // 絵文字を除去した部分をラベルに
      label = plainLabel.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim()
    }

    if (!label || label.length > 25) continue

    // 絵文字を抽出
    const emojiMatch = restOfLine.match(/([\p{Emoji_Presentation}\p{Extended_Pictographic}])/u)
    const emoji = emojiMatch?.[1] ?? ''

    // 説明文を抽出
    let description = ''

    // 1) 同じ行の括弧内
    const parenMatch = restOfLine.match(/[（(](.+?)[）)]/)
    if (parenMatch?.[1]) {
      description = parenMatch[1]
    }
    else {
      // 2) 後続の行から説明を収集（次の番号付き行まで）
      for (let j = i + 1; j < lines.length && j <= i + 3; j++) {
        const nextLine = (lines[j] || '').trim()
        if (!nextLine) continue
        // 次の番号付きアイテムに到達したら停止
        if (/^\d+\.\s/.test(nextLine)) break

        // 括弧で囲まれた行
        const nextParen = nextLine.match(/^[（(](.+?)[）)]$/)
        if (nextParen?.[1]) {
          description = nextParen[1]
          break
        }
        // 「- 」「• 」「・」で始まる行
        if (/^[-•・→]\s*/.test(nextLine)) {
          description = nextLine.replace(/^[-•・→]\s*/, '')
          break
        }
      }
    }

    choices.push({ emoji, label, description })
  }

  return choices
})

/** 複数選択モードかどうか */
const isMultiSelect = computed(() => {
  if (messages.value.length === 0) return false
  const lastMsg = messages.value[messages.value.length - 1]
  if (!lastMsg || lastMsg.role !== 'assistant') return false
  return /複数/.test(lastMsg.content)
})

/** 選択肢カードをクリック */
function toggleChoice(label: string) {
  if (isMultiSelect.value) {
    const next = new Set(selectedReplies.value)
    if (next.has(label)) {
      next.delete(label)
    }
    else {
      next.add(label)
    }
    selectedReplies.value = next
  }
  else {
    inputText.value = label
    sendMessage()
  }
}

/** 複数選択を送信 */
function sendSelectedReplies() {
  const parts: string[] = [...selectedReplies.value]
  if (otherInputText.value.trim()) {
    parts.push(otherInputText.value.trim())
  }
  if (parts.length === 0) return
  inputText.value = parts.join('、')
  selectedReplies.value = new Set()
  otherInputText.value = ''
  showOtherInput.value = false
  sendMessage()
}

/** その他入力で送信 */
function sendOtherInput() {
  if (!otherInputText.value.trim()) return
  inputText.value = otherInputText.value.trim()
  otherInputText.value = ''
  showOtherInput.value = false
  sendMessage()
}

/** ウェルカム画面のサジェスト */
function sendQuickReply(text: string) {
  inputText.value = text
  sendMessage()
}

/** チャット履歴を取得 */
async function loadHistory() {
  try {
    const data = await authFetch<{ id: string; role: string; content: string }[]>(
      `/api/chat/${props.shioriId}/messages`,
    )
    messages.value = data.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))
    scrollToBottom()
  }
  catch {
    // 履歴がなくてもOK
  }
}

/** スクロールを最下部に移動 */
function scrollToBottom(smooth = false) {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTo({
        top: chatContainer.value.scrollHeight,
        behavior: smooth ? 'smooth' : 'instant',
      })
    }
  })
}

/** ストリーミング中の自動スクロール（最下部付近の場合のみ） */
function autoScrollIfNeeded() {
  if (isNearBottom.value) {
    scrollToBottom()
  }
}

/** メッセージ送信（SSEストリーミング） */
async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || isStreaming.value) return

  // 選択状態をリセット
  selectedReplies.value = new Set()
  showOtherInput.value = false
  otherInputText.value = ''

  inputText.value = ''
  messages.value.push({ role: 'user', content: text })
  // 自分が送信した場合は必ず最下部へ
  newMessageCount.value = 0
  scrollToBottom()

  isStreaming.value = true
  messages.value.push({ role: 'assistant', content: '' })
  const assistantIndex = messages.value.length - 1

  try {
    const { session } = useAuth()
    const token = session.value?.access_token
    if (!token) throw new Error('認証が必要です。')

    const apiMessages = messages.value
      .slice(0, -1)
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content }))

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        shioriId: props.shioriId,
        messages: apiMessages,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('ストリーミング非対応')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const data = JSON.parse(line.slice(6))
          if (data.type === 'text') {
            const msg = messages.value[assistantIndex]
            if (msg) msg.content += data.text
            autoScrollIfNeeded()
          }
          else if (data.type === 'error') {
            toast.add({ title: data.message, color: 'error' })
          }
        }
        catch {
          // JSON parse 失敗は無視
        }
      }
    }
  }
  catch (err) {
    console.error('チャットエラー:', err)
    const errMsg = messages.value[assistantIndex]
    if (errMsg) errMsg.content = 'エラーが発生しました。もう一度お試しください。'
    toast.add({ title: 'AI応答の取得に失敗しました', color: 'error' })
  }
  finally {
    isStreaming.value = false
    scrollToBottom()
  }
}

/** Enter キーで送信（Shift+Enter は改行、IME変換中は無視） */
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    sendMessage()
  }
}

onMounted(loadHistory)
</script>

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
        @click="emit('close')"
      />
    </div>

    <!-- メッセージエリア -->
    <div
      ref="chatContainer"
      class="min-h-0 flex-1 overflow-y-auto"
    >
      <div class="space-y-5 px-4 py-4">
        <!-- ウェルカムメッセージ -->
        <div v-if="messages.length === 0" class="py-8 text-center">
          <div class="mb-3 text-4xl">
            ✈️
          </div>
          <h3 class="mb-2 text-lg font-semibold text-stone-900 dark:text-stone-50">
            旅行プランを一緒に考えましょう！
          </h3>
          <p class="mb-4 text-sm text-stone-500">
            行きたい場所やテーマを教えてください
          </p>
          <div class="flex flex-wrap justify-center gap-2">
            <UButton
              v-for="suggestion in ['温泉旅行がしたい', '週末に日帰り旅行', 'おすすめの観光地は？']"
              :key="suggestion"
              variant="outline"
              size="sm"
              @click="sendQuickReply(suggestion)"
            >
              {{ suggestion }}
            </UButton>
          </div>
        </div>

        <!-- 古いメッセージの展開ボタン -->
        <div v-if="hiddenCount > 0" class="flex justify-center py-2">
          <button
            class="flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 text-xs text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-700 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700"
            @click="showAllMessages = true"
          >
            <UIcon name="i-lucide-chevrons-up" class="size-3.5" />
            {{ hiddenCount }}件の古いメッセージを表示
          </button>
        </div>

        <!-- 全表示時の折りたたみボタン -->
        <div v-if="showAllMessages && messages.length > VISIBLE_COUNT" class="flex justify-center py-2">
          <button
            class="flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 text-xs text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-700 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700"
            @click="showAllMessages = false"
          >
            <UIcon name="i-lucide-chevrons-down" class="size-3.5" />
            古いメッセージを折りたたむ
          </button>
        </div>

        <!-- メッセージ一覧 -->
        <template v-for="(msg, localIdx) in visibleMessages" :key="toGlobalIndex(localIdx)">
          <!-- AIメッセージ -->
          <div v-if="msg.role === 'assistant'" class="flex gap-3">
            <!-- AIアバター -->
            <div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-500">
              <UIcon name="i-lucide-bot" class="size-4 text-white" />
            </div>
            <div class="min-w-0 max-w-[85%]">
              <!-- メッセージ本体 -->
              <div class="rounded-2xl rounded-tl-sm border border-stone-200 bg-white px-4 py-3 text-sm leading-relaxed text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-50">
                <!-- 選択肢がある場合は本文のみ表示 -->
                <div
                  v-if="choiceCards.length > 0 && toGlobalIndex(localIdx) === messages.length - 1 && !isStreaming"
                  class="chat-markdown"
                  v-html="renderMd(getMessageBody(getTextWithoutPlan(msg.content)))"
                />
                <!-- プラン含みメッセージ: テキスト部分のみ描画 -->
                <div
                  v-else-if="extractPlan(msg.content) && !(isStreaming && toGlobalIndex(localIdx) === messages.length - 1)"
                  class="chat-markdown"
                  v-html="renderMd(getTextWithoutPlan(msg.content))"
                />
                <!-- 通常表示（PLAN_JSONが途中でもストリップ） -->
                <div v-else class="chat-markdown" v-html="renderMd(getTextWithoutPlan(msg.content))" />

                <!-- 複数選択インジケーター -->
                <p
                  v-if="isMultiSelect && toGlobalIndex(localIdx) === messages.length - 1 && !isStreaming && choiceCards.length > 0"
                  class="mt-2 text-xs font-medium text-orange-500"
                >
                  * 複数選択できます
                </p>

                <!-- ストリーミング中のカーソル（プラン生成中は非表示） -->
                <span
                  v-if="isStreaming && toGlobalIndex(localIdx) === messages.length - 1 && !isPlanStreaming(msg.content)"
                  class="inline-block h-4 w-0.5 animate-pulse bg-stone-400"
                />
              </div>

              <!-- プラン生成中インジケーター -->
              <div
                v-if="isStreaming && toGlobalIndex(localIdx) === messages.length - 1 && isPlanStreaming(msg.content)"
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
                        プランを作成しています...
                      </p>
                      <p class="mt-0.5 text-xs text-stone-400">
                        {{ countStreamingEvents(msg.content) }}件のイベントを生成中
                      </p>
                    </div>
                  </div>
                  <!-- プログレスバー -->
                  <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-orange-100 dark:bg-orange-900/30">
                    <div class="h-full animate-pulse rounded-full bg-gradient-to-r from-orange-400 via-pink-400 to-orange-400" style="width: 60%; animation-duration: 1.5s;" />
                  </div>
                </div>
              </div>

              <!-- プランプレビュー（PLAN_JSONが含まれるメッセージ、完了後） -->
              <ChatPlanPreview
                v-if="extractPlan(msg.content) && !(isStreaming && toGlobalIndex(localIdx) === messages.length - 1)"
                :plan="extractPlan(msg.content)!"
                :shiori-id="props.shioriId"
                :applied="appliedPlanIndices.has(toGlobalIndex(localIdx))"
                @apply="(plan) => applyPlan(plan, toGlobalIndex(localIdx))"
              />
            </div>
          </div>

          <!-- ユーザーメッセージ -->
          <div v-else class="flex gap-3" style="flex-direction: row-reverse;">
            <!-- ユーザーアバター -->
            <div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-100">
              <UIcon name="i-lucide-user" class="size-4 text-indigo-500" />
            </div>
            <div class="max-w-[85%] rounded-2xl rounded-tr-sm bg-orange-500 px-4 py-3 text-sm leading-relaxed text-white">
              <div class="whitespace-pre-wrap">
                {{ msg.content }}
              </div>
            </div>
          </div>

          <!-- 選択肢カード（最後のAIメッセージの後に表示） -->
          <div
            v-if="msg.role === 'assistant' && toGlobalIndex(localIdx) === messages.length - 1 && !isStreaming && choiceCards.length > 0"
            class="ml-12 space-y-3"
          >
            <!-- 2カラムのカードグリッド -->
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                v-for="choice in choiceCards"
                :key="choice.label"
                class="flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all"
                :class="
                  selectedReplies.has(choice.label)
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                    : 'border-stone-200 bg-white hover:border-orange-300 dark:border-stone-700 dark:bg-stone-900'
                "
                @click="toggleChoice(choice.label)"
              >
                <span v-if="choice.emoji" class="text-2xl leading-none">{{ choice.emoji }}</span>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5">
                    <span class="text-sm font-semibold text-stone-900 dark:text-stone-50">{{ choice.label }}</span>
                    <UIcon
                      v-if="selectedReplies.has(choice.label)"
                      name="i-lucide-check"
                      class="size-4 shrink-0 text-orange-500"
                    />
                  </div>
                  <p v-if="choice.description" class="mt-0.5 text-xs leading-snug text-stone-500">
                    {{ choice.description }}
                  </p>
                </div>
              </button>
            </div>

            <!-- その他（自由入力） -->
            <button
              class="flex w-full items-center gap-2 rounded-xl border-2 border-dashed p-3 text-sm transition-all"
              :class="
                showOtherInput
                  ? 'border-orange-500 bg-orange-50 text-orange-600 dark:bg-orange-900/20'
                  : 'border-stone-200 text-stone-400 hover:border-orange-300 hover:text-orange-500 dark:border-stone-700'
              "
              @click="showOtherInput = !showOtherInput"
            >
              <UIcon name="i-lucide-pencil" class="size-4" />
              <span>その他（自由入力）</span>
            </button>

            <!-- 自由入力フィールド -->
            <div v-if="showOtherInput" class="flex gap-2">
              <UInput
                v-model="otherInputText"
                placeholder="希望を自由に入力してください..."
                class="flex-1"
                @keydown.enter="isMultiSelect ? null : sendOtherInput()"
              />
              <UButton
                v-if="!isMultiSelect"
                icon="i-lucide-arrow-right"
                size="sm"
                :disabled="!otherInputText.trim()"
                @click="sendOtherInput"
              />
            </div>

            <!-- 送信ボタン（複数選択時 or 単一+その他入力あり） -->
            <UButton
              v-if="isMultiSelect && (selectedReplies.size > 0 || otherInputText.trim())"
              icon="i-lucide-arrow-right"
              class="w-full justify-center"
              @click="sendSelectedReplies"
            >
              {{ selectedReplies.size + (otherInputText.trim() ? 1 : 0) }}件選択して次へ
            </UButton>
          </div>
        </template>
      </div>
    </div>

    <!-- 入力エリア（フローティングボタンの位置基準） -->
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
        <button
          v-if="!isNearBottom"
          class="absolute -top-12 right-4 z-10 flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-medium text-stone-600 shadow-lg ring-1 ring-stone-200 transition-colors hover:bg-stone-50 dark:bg-stone-800 dark:text-stone-300 dark:ring-stone-700 dark:hover:bg-stone-700"
          @click="scrollToBottom(true)"
        >
          <UIcon name="i-lucide-arrow-down" class="size-3.5" />
          <span>最新へ</span>
          <span
            v-if="newMessageCount > 0"
            class="flex size-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white"
          >
            {{ newMessageCount }}
          </span>
        </button>
      </Transition>
      <div class="flex items-end gap-2">
        <UTextarea
          v-model="inputText"
          placeholder="メッセージを入力..."
          :rows="1"
          autoresize
          :maxrows="4"
          class="flex-1"
          :disabled="isStreaming"
          @keydown="handleKeydown"
        />
        <UButton
          icon="i-lucide-send"
          :loading="isStreaming"
          :disabled="!inputText.trim() || isStreaming"
          @click="sendMessage"
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
