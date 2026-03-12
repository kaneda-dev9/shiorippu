<template>
  <div ref="containerRef" class="relative">
    <UInput
      :model-value="displayValue"
      :placeholder="placeholder"
      icon="i-lucide-map-pin"
      size="lg"
      class="w-full"
      @update:model-value="onInput"
      @focus="showDropdown = true"
    />

    <!-- 検索結果ドロップダウン -->
    <div
      v-if="showDropdown && suggestions.length > 0"
      class="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-stone-200 bg-white shadow-lg dark:border-stone-700 dark:bg-stone-900"
    >
      <button
        v-for="sug in suggestions"
        :key="sug.placeId"
        type="button"
        class="flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-orange-50 dark:hover:bg-orange-900/20"
        @mousedown.prevent="selectPlace(sug)"
      >
        <UIcon name="i-lucide-map-pin" class="mt-0.5 size-4 shrink-0 text-stone-400" />
        <div class="min-w-0">
          <p class="truncate font-medium text-stone-900 dark:text-stone-50">
            {{ sug.mainText }}
          </p>
          <p class="truncate text-xs text-stone-400">
            {{ sug.secondaryText }}
          </p>
        </div>
      </button>
    </div>

    <!-- 選択済み表示 -->
    <div
      v-if="selectedPlace && !showDropdown"
      class="mt-1 flex items-center gap-1 text-xs text-green-600 dark:text-green-400"
    >
      <UIcon name="i-lucide-check-circle" class="size-3" />
      位置情報取得済み
    </div>
  </div>
</template>

<script setup lang="ts">
import { onClickOutside, useDebounceFn } from '@vueuse/core'

export interface PlaceResult {
  address: string
  lat: number
  lng: number
  placeId: string
}

interface Suggestion {
  placeId: string
  mainText: string
  secondaryText: string
  description: string
}

const props = withDefaults(defineProps<{
  placeholder?: string
}>(), {
  placeholder: '場所を検索...',
})

const value = defineModel<string>('value', { default: '' })

const emit = defineEmits<{
  'place-selected': [result: PlaceResult]
  'place-cleared': []
}>()

const { load } = useGoogleMaps()

const containerRef = useTemplateRef<HTMLElement>('containerRef')
const displayValue = ref<string>(value.value)
const showDropdown = ref<boolean>(false)
const suggestions = ref<Suggestion[]>([])
const selectedPlace = ref<PlaceResult | null>(null)
const mapsLoaded = ref<boolean>(false)

// 外部クリックでドロップダウンを閉じる
onClickOutside(containerRef, () => {
  showDropdown.value = false
})

// value が外から変わったら同期
watch(value, (v) => {
  displayValue.value = v
})

// Google Maps API を初期化
onMounted(async () => {
  await load()
  mapsLoaded.value = true
})

// 入力変更時のデバウンス検索
const searchPlaces = useDebounceFn(async (input: string) => {
  if (!mapsLoaded.value || input.length < 2) {
    suggestions.value = []
    return
  }

  try {
    const request = {
      input,
      includedRegionCodes: ['jp'],
      language: 'ja',
    }
    const { suggestions: results } = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request)

    suggestions.value = results
      .filter(s => s.placePrediction)
      .map((s) => {
        const pred = s.placePrediction!
        return {
          placeId: pred.placeId,
          mainText: pred.mainText?.text || '',
          secondaryText: pred.secondaryText?.text || '',
          description: pred.text?.text || '',
        }
      })
    showDropdown.value = suggestions.value.length > 0
  }
  catch (e) {
    console.error('Places検索エラー:', e)
    suggestions.value = []
  }
}, 300)

function onInput(inputVal: string | number) {
  const str = String(inputVal)
  displayValue.value = str
  value.value = str

  // 手入力で変更されたら選択状態をクリア
  if (selectedPlace.value) {
    selectedPlace.value = null
    emit('place-cleared')
  }

  searchPlaces(str)
}

/** 候補を選択して詳細を取得 */
async function selectPlace(sug: Suggestion) {
  showDropdown.value = false
  suggestions.value = []

  try {
    const place = new google.maps.places.Place({ id: sug.placeId })
    await place.fetchFields({ fields: ['location', 'formattedAddress'] })

    if (!place.location) {
      displayValue.value = sug.description
      value.value = sug.description
      return
    }

    const result: PlaceResult = {
      address: place.formattedAddress || sug.description,
      lat: place.location.lat(),
      lng: place.location.lng(),
      placeId: sug.placeId,
    }

    displayValue.value = result.address
    selectedPlace.value = result
    value.value = result.address
    emit('place-selected', result)
  }
  catch (e) {
    console.error('Place詳細取得エラー:', e)
    displayValue.value = sug.description
    value.value = sug.description
  }
}
</script>
