<script setup lang="ts">
import { z } from 'zod'
import type { Event, EventCategory, DayWithEvents } from '~~/types/database'
import type { PlaceResult } from '~~/app/components/containers/map/PlaceAutocomplete.vue'
import { categoryLabels, categoryIcons } from '~~/shared/category-icons'

const props = defineProps<{
  dayId: string
  event?: Event | null
  days?: DayWithEvents[]
}>()

const isOpen = defineModel<boolean>('show', { required: true })

const emit = defineEmits<{
  'saved': [event: Event]
}>()

const { authFetch } = useAuthFetch()
const toast = useToast()

const saving = ref<boolean>(false)

// バリデーションスキーマ
const schema = z.object({
  title: z.string().min(1, 'タイトルを入力してください'),
  category: z.string(),
  day_id: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  memo: z.string(),
  url: z.string(),
  address: z.string(),
})

// フォーム状態
interface FormValue {
  title: string
  category: EventCategory
  day_id: string
  start_time: string
  end_time: string
  memo: string
  url: string
  address: string
  lat: number | null
  lng: number | null
  place_id: string | null
}

const initialFormValue: FormValue = {
  title: '',
  category: 'other',
  day_id: '',
  start_time: '',
  end_time: '',
  memo: '',
  url: '',
  address: '',
  lat: null,
  lng: null,
  place_id: null,
}

const form = ref<FormValue>({ ...initialFormValue })

// 編集モードの場合、既存データで初期化
watch([() => props.event, () => props.dayId], ([ev, dayId]) => {
  if (ev) {
    form.value = {
      title: ev.title,
      category: ev.category,
      day_id: ev.day_id,
      start_time: ev.start_time?.slice(0, 5) || '',
      end_time: ev.end_time?.slice(0, 5) || '',
      memo: ev.memo || '',
      url: ev.url || '',
      address: ev.address || '',
      lat: ev.lat,
      lng: ev.lng,
      place_id: ev.place_id,
    }
  }
  else {
    form.value = { ...initialFormValue, day_id: dayId }
  }
}, { immediate: true })

// Day選択肢を生成
const dayOptions = computed(() =>
  (props.days || []).map((d) => ({
    label: `Day ${d.day_number}${d.date ? ` (${d.date})` : ''}`,
    value: d.id,
  })),
)

const isEditMode = computed(() => !!props.event)

function onPlaceSelected(result: PlaceResult) {
  form.value.lat = result.lat
  form.value.lng = result.lng
  form.value.place_id = result.placeId
  form.value.address = result.address
}

function onPlaceCleared() {
  form.value.lat = null
  form.value.lng = null
  form.value.place_id = null
}

// カテゴリの選択肢を生成
const categoryOptions = Object.entries(categoryLabels).map(([value, label]) => ({
  label,
  value,
  icon: categoryIcons[value as EventCategory],
}))

async function handleSubmit() {
  saving.value = true
  try {
    const f = form.value
    const payload = {
      title: f.title.trim(),
      category: f.category,
      icon: categoryIcons[f.category],
      start_time: f.start_time || null,
      end_time: f.end_time || null,
      memo: f.memo.trim() || null,
      url: f.url.trim() || null,
      address: f.address.trim() || null,
      lat: f.lat,
      lng: f.lng,
      place_id: f.place_id,
    }

    let result: Event

    if (isEditMode.value && props.event) {
      result = await authFetch<Event>(`/api/event/${props.event.id}`, {
        method: 'PUT',
        body: { ...payload, day_id: f.day_id },
      })
    }
    else {
      result = await authFetch<Event>('/api/event', {
        method: 'POST',
        body: { ...payload, day_id: f.day_id },
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
      <UForm :schema="schema" :state="form" class="space-y-4" @submit="handleSubmit">
        <!-- タイトル -->
        <UFormField name="title" label="タイトル" required>
          <UInput
            v-model="form.title"
            placeholder="例: 東京駅で新幹線に乗る…"
            icon="i-lucide-type"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <!-- カテゴリ & 所属する日程 -->
        <div class="grid grid-cols-2 gap-3">
          <UFormField name="category" label="カテゴリ">
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

          <UFormField v-if="dayOptions.length > 1" name="day_id" label="所属する日程">
            <USelectMenu
              v-model="form.day_id"
              :items="dayOptions"
              value-key="value"
              placeholder="日程を選択"
              size="lg"
              class="w-full"
            />
          </UFormField>
        </div>

        <!-- 時間 -->
        <div class="grid grid-cols-2 gap-3">
          <UFormField name="start_time" label="開始時刻">
            <UInput
              v-model="form.start_time"
              type="time"
              icon="i-lucide-clock"
              size="lg"
              class="w-full"
            />
          </UFormField>
          <UFormField name="end_time" label="終了時刻">
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
        <UFormField name="address" label="場所・住所">
          <ContainersMapPlaceAutocomplete
            v-model:value="form.address"
            placeholder="場所を検索…"
            @place-selected="onPlaceSelected"
            @place-cleared="onPlaceCleared"
          />
        </UFormField>

        <!-- URL -->
        <UFormField name="url" label="URL">
          <UInput
            v-model="form.url"
            placeholder="https://…"
            icon="i-lucide-link"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <!-- メモ -->
        <UFormField name="memo" label="メモ">
          <UTextarea
            v-model="form.memo"
            placeholder="メモや注意事項を記入…"
            :rows="3"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <!-- フッターボタン（UForm内に配置して type="submit" を有効にする） -->
        <div class="flex justify-end gap-2 border-t border-default pt-4">
          <UButton
            variant="ghost"
            @click="isOpen = false"
          >
            キャンセル
          </UButton>
          <UButton
            type="submit"
            :loading="saving"
          >
            {{ isEditMode ? '更新する' : '追加する' }}
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
