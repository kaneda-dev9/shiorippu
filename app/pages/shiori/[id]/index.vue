<script setup lang="ts">
import type { ShioriWithDays } from '~~/types/database'

definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const supabase = useSupabase()
const shioriId = route.params.id as string

const shiori = ref<ShioriWithDays | null>(null)
const loading = ref(true)

async function fetchShiori() {
  loading.value = true

  // Fetch shiori with days and events
  const { data: shioriData, error: shioriError } = await supabase
    .from('shioris')
    .select('*')
    .eq('id', shioriId)
    .single()

  if (shioriError || !shioriData) {
    await navigateTo('/dashboard')
    return
  }

  const { data: daysData } = await supabase
    .from('days')
    .select('*, events:events(*)')
    .eq('shiori_id', shioriId)
    .order('sort_order')
    .order('sort_order', { referencedTable: 'events' })

  shiori.value = {
    ...shioriData,
    days: daysData || [],
  }

  loading.value = false
}

onMounted(fetchShiori)
</script>

<template>
  <div v-if="loading" class="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
    <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-orange-500" />
  </div>

  <div v-else-if="shiori" class="mx-auto max-w-5xl px-4 py-6">
    <!-- Editor Header -->
    <div class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <UButton
          icon="i-lucide-arrow-left"
          variant="ghost"
          size="sm"
          to="/dashboard"
        />
        <h1 class="text-xl font-bold text-stone-900 dark:text-stone-50">
          {{ shiori.title }}
        </h1>
      </div>
      <div class="flex items-center gap-2">
        <UButton icon="i-lucide-sparkles" variant="soft" size="sm">
          AI相談
        </UButton>
        <UButton icon="i-lucide-share-2" variant="ghost" size="sm">
          共有
        </UButton>
        <UButton icon="i-lucide-eye" variant="ghost" size="sm">
          プレビュー
        </UButton>
      </div>
    </div>

    <!-- Empty state for new shiori -->
    <div v-if="shiori.days.length === 0" class="py-16 text-center">
      <div class="mb-4 text-5xl">
        🗓️
      </div>
      <h3 class="mb-2 text-lg font-semibold text-stone-900 dark:text-stone-50">
        まだ予定がありません
      </h3>
      <p class="mb-6 text-stone-500">
        AIに相談してプランを作るか、手動で日程を追加しましょう
      </p>
      <div class="flex items-center justify-center gap-3">
        <UButton icon="i-lucide-sparkles">
          AIでプランを作る
        </UButton>
        <UButton icon="i-lucide-plus" variant="outline">
          日程を追加
        </UButton>
      </div>
    </div>

    <!-- Day list (placeholder for editor) -->
    <div v-else class="space-y-6">
      <div v-for="day in shiori.days" :key="day.id">
        <h2 class="mb-3 text-sm font-semibold text-orange-500">
          Day {{ day.day_number }}
          <span v-if="day.date" class="ml-2 text-stone-400">{{ day.date }}</span>
        </h2>
        <div class="space-y-2">
          <UCard v-for="event in day.events" :key="event.id" class="p-3">
            <div class="flex items-center gap-3">
              <span class="text-sm font-medium text-stone-500">
                {{ event.start_time?.slice(0, 5) }}
              </span>
              <span class="font-medium text-stone-900 dark:text-stone-50">
                {{ event.title }}
              </span>
            </div>
          </UCard>
        </div>
      </div>
    </div>
  </div>
</template>
