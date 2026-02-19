<script setup lang="ts">
import type { Shiori } from '~~/types/database'

definePageMeta({
  middleware: 'auth',
})

const supabase = useSupabase()
const { user } = useAuth()

const shioris = ref<Shiori[]>([])
const loading = ref(true)

// Fetch user's shioris
async function fetchShioris() {
  if (!user.value) return

  loading.value = true
  const { data, error } = await supabase
    .from('shioris')
    .select('*')
    .eq('owner_id', user.value.id)
    .order('updated_at', { ascending: false })

  if (!error && data) {
    shioris.value = data
  }
  loading.value = false
}

// Create new shiori
async function createShiori() {
  if (!user.value) return

  const { data, error } = await supabase
    .from('shioris')
    .insert({ owner_id: user.value.id })
    .select()
    .single()

  if (!error && data) {
    await navigateTo(`/shiori/${data.id}`)
  }
}

onMounted(fetchShioris)

function formatDate(dateStr: string | null) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8">
    <!-- Header -->
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-stone-900 dark:text-stone-50">
          マイしおり
        </h1>
        <p class="text-sm text-stone-500">
          旅のしおりを作成・管理
        </p>
      </div>
      <UButton icon="i-lucide-plus" @click="createShiori">
        新しいしおり
      </UButton>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-16">
      <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-orange-500" />
    </div>

    <!-- Empty state -->
    <div v-else-if="shioris.length === 0" class="py-16 text-center">
      <div class="mb-4 text-5xl">
        🗺️
      </div>
      <h3 class="mb-2 text-lg font-semibold text-stone-900 dark:text-stone-50">
        まだしおりがありません
      </h3>
      <p class="mb-6 text-stone-500">
        AIと一緒に旅のプランを作ってみましょう！
      </p>
      <UButton icon="i-lucide-sparkles" @click="createShiori">
        AIで旅を計画する
      </UButton>
    </div>

    <!-- Shiori list -->
    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <UCard
        v-for="shiori in shioris"
        :key="shiori.id"
        class="cursor-pointer transition-shadow hover:shadow-md"
        @click="navigateTo(`/shiori/${shiori.id}`)"
      >
        <!-- Cover image or gradient -->
        <div class="mb-3 flex h-24 items-center justify-center rounded-lg bg-gradient-to-br from-orange-100 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/10">
          <span class="text-3xl">✈️</span>
        </div>

        <h3 class="mb-1 font-semibold text-stone-900 dark:text-stone-50">
          {{ shiori.title }}
        </h3>

        <div class="flex flex-wrap gap-2 text-xs text-stone-500">
          <span v-if="shiori.area" class="flex items-center gap-1">
            <UIcon name="i-lucide-map-pin" class="size-3" />
            {{ shiori.area }}
          </span>
          <span v-if="shiori.start_date" class="flex items-center gap-1">
            <UIcon name="i-lucide-calendar" class="size-3" />
            {{ formatDate(shiori.start_date) }}
            <template v-if="shiori.end_date">
              〜 {{ formatDate(shiori.end_date) }}
            </template>
          </span>
        </div>
      </UCard>
    </div>
  </div>
</template>
