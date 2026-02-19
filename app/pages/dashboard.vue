<script setup lang="ts">
import type { Shiori } from '~~/types/database'

definePageMeta({
  middleware: 'auth',
})

const supabase = useSupabase()
const { user } = useAuth()

const shioris = ref<Shiori[]>([])
const loading = ref(true)

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
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
    <!-- ページヘッダー -->
    <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-stone-900 dark:text-stone-50">
          マイしおり
        </h1>
        <p class="mt-1 text-sm text-stone-500">
          旅のしおりを作成・管理
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        size="lg"
        @click="createShiori"
      >
        新しいしおり
      </UButton>
    </div>

    <!-- ローディングスケルトン -->
    <div v-if="loading" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <UCard v-for="i in 6" :key="i">
        <div class="flex flex-col gap-3">
          <USkeleton class="h-28 w-full rounded-lg" />
          <USkeleton class="h-5 w-3/4" />
          <div class="flex gap-2">
            <USkeleton class="h-4 w-20" />
            <USkeleton class="h-4 w-28" />
          </div>
        </div>
      </UCard>
    </div>

    <!-- 空状態 -->
    <div v-else-if="shioris.length === 0">
      <UCard class="py-8">
        <div class="flex flex-col items-center text-center">
          <div class="mb-4 flex size-20 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
            <UIcon name="i-lucide-map" class="size-10 text-orange-500" />
          </div>
          <h3 class="mb-2 text-lg font-semibold text-stone-900 dark:text-stone-50">
            まだしおりがありません
          </h3>
          <p class="mb-6 max-w-sm text-sm text-stone-500">
            AIと一緒に旅のプランを作ってみましょう！行き先やテーマを伝えるだけで、最適なプランを提案します。
          </p>
          <UButton
            icon="i-lucide-sparkles"
            size="lg"
            @click="createShiori"
          >
            AIで旅を計画する
          </UButton>
        </div>
      </UCard>
    </div>

    <!-- しおり一覧グリッド -->
    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <UCard
        v-for="shiori in shioris"
        :key="shiori.id"
        class="cursor-pointer transition-all hover:shadow-md hover:ring-1 hover:ring-orange-200 dark:hover:ring-orange-800"
        @click="navigateTo(`/shiori/${shiori.id}`)"
      >
        <!-- カバー画像 or グラデーション -->
        <div
          v-if="shiori.cover_image_url"
          class="mb-3 h-28 overflow-hidden rounded-lg bg-stone-100"
        >
          <img
            :src="shiori.cover_image_url"
            :alt="shiori.title"
            class="size-full object-cover"
          >
        </div>
        <div
          v-else
          class="mb-3 flex h-28 items-center justify-center rounded-lg bg-gradient-to-br from-orange-100 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/10"
        >
          <UIcon name="i-lucide-map" class="size-10 text-orange-300 dark:text-orange-700" />
        </div>

        <!-- タイトル -->
        <h3 class="mb-2 truncate font-semibold text-stone-900 dark:text-stone-50">
          {{ shiori.title }}
        </h3>

        <!-- メタ情報 -->
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
          <span v-if="shiori.area" class="flex items-center gap-1">
            <UIcon name="i-lucide-map-pin" class="size-3.5" />
            {{ shiori.area }}
          </span>
          <span v-if="shiori.start_date" class="flex items-center gap-1">
            <UIcon name="i-lucide-calendar" class="size-3.5" />
            {{ formatDateShort(shiori.start_date) }}
            <template v-if="shiori.end_date">
              〜 {{ formatDateShort(shiori.end_date) }}
            </template>
          </span>
        </div>

        <!-- ステータスバッジ -->
        <div class="mt-3 flex items-center justify-between">
          <UBadge
            v-if="shiori.is_public"
            variant="subtle"
            color="success"
            size="xs"
          >
            公開中
          </UBadge>
          <span v-else />
          <span class="text-xs text-stone-400">
            {{ formatDateShort(shiori.updated_at) }} 更新
          </span>
        </div>
      </UCard>
    </div>
  </div>
</template>
