<script setup lang="ts">
import type { Event, EventCategory } from '~~/types/database'
import type { PlaceResult } from '~~/app/components/map/PlaceAutocomplete.vue'
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
  lat: null as number | null,
  lng: null as number | null,
  place_id: null as string | null,
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
    form.lat = ev.lat
    form.lng = ev.lng
    form.place_id = ev.place_id
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
  form.lat = null
  form.lng = null
  form.place_id = null
}

const isEditMode = computed(() => !!props.event)

function onPlaceSelected(result: PlaceResult) {
  form.lat = result.lat
  form.lng = result.lng
  form.place_id = result.placeId
  form.address = result.address
}

function onPlaceCleared() {
  form.lat = null
  form.lng = null
  form.place_id = null
}

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
      lat: form.lat,
      lng: form.lng,
      place_id: form.place_id,
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
    <template #title>
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
            size="lg"
            class="w-full"
          />
        </UFormField>

        <!-- カテゴリ -->
        <UFormField label="カテゴリ" class="w-1/2">
          <USelectMenu
            v-model="form.category"
            :items="categoryOptions"
            value-key="value"
            placeholder="カテゴリを選択"
            size="lg"
            class="w-full"
            :ui="{ content: 'min-w-48' }"
          />
        </UFormField>

        <!-- 時間 -->
        <div class="grid grid-cols-2 gap-3">
          <UFormField label="開始時刻">
            <UInput
              v-model="form.start_time"
              type="time"
              icon="i-lucide-clock"
              size="lg"
              class="w-full"
            />
          </UFormField>
          <UFormField label="終了時刻">
            <UInput
              v-model="form.end_time"
              type="time"
              icon="i-lucide-clock"
              size="lg"
              class="w-full"
            />
          </UFormField>
        </div>

        <!-- 場所（Places Autocomplete） -->
        <UFormField label="場所・住所">
          <MapPlaceAutocomplete
            v-model="form.address"
            placeholder="場所を検索..."
            @place-selected="onPlaceSelected"
            @place-cleared="onPlaceCleared"
          />
        </UFormField>

        <!-- URL -->
        <UFormField label="URL">
          <UInput
            v-model="form.url"
            placeholder="https://..."
            icon="i-lucide-link"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <!-- メモ -->
        <UFormField label="メモ">
          <UTextarea
            v-model="form.memo"
            placeholder="メモや注意事項を記入..."
            :rows="3"
            size="lg"
            class="w-full"
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
