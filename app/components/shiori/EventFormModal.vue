<script setup lang="ts">
import type { Event, EventCategory } from '~~/types/database'
import { categoryLabels, categoryIcons } from '~~/shared/category-icons'

const props = defineProps<{
  modelValue: boolean
  dayId: string
  event?: Event | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'saved': [event: Event]
}>()

const { authFetch } = useAuthFetch()
const toast = useToast()

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const saving = ref(false)

// フォーム状態
const form = reactive({
  title: '',
  category: 'other' as EventCategory,
  start_time: '',
  end_time: '',
  memo: '',
  url: '',
  address: '',
})

// 編集モードの場合、既存データで初期化
watch(() => props.event, (ev) => {
  if (ev) {
    form.title = ev.title
    form.category = ev.category
    form.start_time = ev.start_time?.slice(0, 5) || ''
    form.end_time = ev.end_time?.slice(0, 5) || ''
    form.memo = ev.memo || ''
    form.url = ev.url || ''
    form.address = ev.address || ''
  }
  else {
    resetForm()
  }
}, { immediate: true })

function resetForm() {
  form.title = ''
  form.category = 'other'
  form.start_time = ''
  form.end_time = ''
  form.memo = ''
  form.url = ''
  form.address = ''
}

const isEditMode = computed(() => !!props.event)

// カテゴリの選択肢を生成
const categoryOptions = Object.entries(categoryLabels).map(([value, label]) => ({
  label,
  value,
  icon: categoryIcons[value as EventCategory],
}))

async function handleSubmit() {
  if (!form.title.trim()) {
    toast.add({ title: 'タイトルを入力してください', color: 'error' })
    return
  }

  saving.value = true
  try {
    const payload = {
      title: form.title.trim(),
      category: form.category,
      icon: categoryIcons[form.category],
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      memo: form.memo.trim() || null,
      url: form.url.trim() || null,
      address: form.address.trim() || null,
    }

    let result: Event

    if (isEditMode.value && props.event) {
      result = await authFetch<Event>(`/api/event/${props.event.id}`, {
        method: 'PUT',
        body: payload,
      })
    }
    else {
      result = await authFetch<Event>('/api/event', {
        method: 'POST',
        body: { ...payload, day_id: props.dayId },
      })
    }

    emit('saved', result)
    isOpen.value = false
    toast.add({
      title: isEditMode.value ? 'イベントを更新しました' : 'イベントを追加しました',
      color: 'success',
    })
  }
  catch (err) {
    console.error('イベント保存エラー:', err)
    toast.add({ title: 'イベントの保存に失敗しました', color: 'error' })
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal v-model:open="isOpen" :title="isEditMode ? 'イベントを編集' : 'イベントを追加'">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon
          :name="categoryIcons[form.category] || 'i-lucide-map-pin'"
          class="size-5 text-orange-500"
        />
        <span class="font-semibold">
          {{ isEditMode ? 'イベントを編集' : 'イベントを追加' }}
        </span>
      </div>
    </template>

    <template #body>
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <!-- タイトル -->
        <UFormField label="タイトル" required>
          <UInput
            v-model="form.title"
            placeholder="例: 東京駅で新幹線に乗る"
            icon="i-lucide-type"
          />
        </UFormField>

        <!-- カテゴリ -->
        <UFormField label="カテゴリ">
          <USelectMenu
            v-model="form.category"
            :items="categoryOptions"
            value-key="value"
            placeholder="カテゴリを選択"
          />
        </UFormField>

        <!-- 時間 -->
        <div class="grid grid-cols-2 gap-3">
          <UFormField label="開始時刻">
            <UInput
              v-model="form.start_time"
              type="time"
              icon="i-lucide-clock"
            />
          </UFormField>
          <UFormField label="終了時刻">
            <UInput
              v-model="form.end_time"
              type="time"
              icon="i-lucide-clock"
            />
          </UFormField>
        </div>

        <!-- 住所 -->
        <UFormField label="場所・住所">
          <UInput
            v-model="form.address"
            placeholder="例: 東京都千代田区丸の内1丁目"
            icon="i-lucide-map-pin"
          />
        </UFormField>

        <!-- URL -->
        <UFormField label="URL">
          <UInput
            v-model="form.url"
            placeholder="https://..."
            icon="i-lucide-link"
          />
        </UFormField>

        <!-- メモ -->
        <UFormField label="メモ">
          <UTextarea
            v-model="form.memo"
            placeholder="メモや注意事項を記入..."
            :rows="3"
          />
        </UFormField>
      </form>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          variant="ghost"
          @click="isOpen = false"
        >
          キャンセル
        </UButton>
        <UButton
          :loading="saving"
          @click="handleSubmit"
        >
          {{ isEditMode ? '更新する' : '追加する' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
