<template>
  <div class="space-y-3">
    <!-- カードグリッド -->
    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <button
        v-for="choice in choices"
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
        placeholder="希望を自由に入力してください…"
        class="flex-1"
        @keydown.enter="singleSelect ? sendOtherInput() : undefined"
      />
      <UButton
        v-if="singleSelect"
        icon="i-lucide-arrow-right"
        size="sm"
        aria-label="送信"
        :disabled="!otherInputText.trim()"
        @click="sendOtherInput"
      />
    </div>

    <!-- 送信ボタン（複数選択時） -->
    <UButton
      v-if="!singleSelect && (selectedReplies.size > 0 || otherInputText.trim())"
      icon="i-lucide-arrow-right"
      class="w-full justify-center"
      @click="sendSelectedReplies"
    >
      {{ selectedReplies.size + (otherInputText.trim() ? 1 : 0) }}件選択して次へ
    </UButton>
  </div>
</template>

<script setup lang="ts">
import type { ChoiceCard } from '~~/app/utils/chatHelpers'

const props = defineProps<{
  choices: ChoiceCard[]
  singleSelect: boolean
}>()

const emit = defineEmits<{
  send: [text: string]
}>()

const selectedReplies = ref<Set<string>>(new Set())
const showOtherInput = ref<boolean>(false)
const otherInputText = ref<string>('')

/** 選択肢カードをクリック */
function toggleChoice(label: string) {
  if (props.singleSelect) {
    emit('send', label)
    return
  }
  const next = new Set(selectedReplies.value)
  if (next.has(label)) {
    next.delete(label)
  }
  else {
    next.add(label)
  }
  selectedReplies.value = next
}

/** 複数選択を送信 */
function sendSelectedReplies() {
  const parts: string[] = [...selectedReplies.value]
  if (otherInputText.value.trim()) {
    parts.push(otherInputText.value.trim())
  }
  if (parts.length === 0) return
  emit('send', parts.join('、'))
  selectedReplies.value = new Set()
  otherInputText.value = ''
  showOtherInput.value = false
}

/** その他入力で送信 */
function sendOtherInput() {
  if (!otherInputText.value.trim()) return
  emit('send', otherInputText.value.trim())
  otherInputText.value = ''
  showOtherInput.value = false
}
</script>
