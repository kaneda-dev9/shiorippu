<script setup lang="ts">
import dayjs from 'dayjs'
import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import type { Shiori } from '~~/types/database'

definePageMeta({
  middleware: 'auth',
})

const { authFetch } = useAuthFetch()
const { user, session, loading: authLoading } = useAuth()
const toast = useToast()
const queryCache = useQueryCache()

const deleteTarget = ref<Shiori | null>(null)
const showDeleteModal = ref<boolean>(false)

const { data: shioris, asyncStatus } = useQuery({
  key: shioriKeys.list,
  query: () => authFetch<Shiori[]>('/api/shiori'),
  enabled: () => !authLoading.value && !!session.value,
})
const loading = computed(() => asyncStatus.value === 'loading')

const { mutateAsync: createShioriMutate } = useMutation({
  mutation: () => authFetch<Shiori>('/api/shiori', { method: 'POST' }),
  onSettled: () => queryCache.invalidateQueries({ key: shioriKeys.list() }),
})

async function createShiori() {
  try {
    const data = await createShioriMutate()
    await navigateTo(`/shiori/${data.id}`)
  }
  catch {
    toast.add({ title: 'しおりの作成に失敗しました', color: 'error' })
  }
}

function confirmDelete(shiori: Shiori, e: MouseEvent) {
  e.stopPropagation()
  deleteTarget.value = shiori
  showDeleteModal.value = true
}

const { mutate: deleteShioriMutate, isLoading: deleting } = useMutation({
  mutation: (id: string) => authFetch(`/api/shiori/${id}`, { method: 'DELETE' }),
  onMutate: (id) => {
    queryCache.cancelQueries({ key: shioriKeys.list() })
    const previous = queryCache.getQueryData<Shiori[]>(shioriKeys.list())
    queryCache.setQueryData<Shiori[]>(shioriKeys.list(),
      (old) => old?.filter((s) => s.id !== id) ?? [])
    return { previous }
  },
  onError: (_e, _id, ctx) => {
    if (ctx?.previous) {
      queryCache.setQueryData(shioriKeys.list(), ctx.previous)
    }
    toast.add({ title: 'しおりの削除に失敗しました', color: 'error' })
  },
  onSuccess: () => toast.add({ title: 'しおりを削除しました', color: 'success' }),
  onSettled: () => queryCache.invalidateQueries({ key: shioriKeys.list() }),
})

function deleteShiori() {
  if (!deleteTarget.value) return
  deleteShioriMutate(deleteTarget.value.id)
  showDeleteModal.value = false
  deleteTarget.value = null
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
    <!-- ページヘッダー -->
    <div class="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold font-display text-stone-800 dark:text-stone-50">
          マイしおり
        </h1>
        <p class="mt-1 text-sm leading-relaxed text-stone-500">
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
    <div v-else-if="!shioris || shioris.length === 0">
      <UCard class="py-8">
        <AtomsEmptyState
          icon="i-lucide-pen-line"
          icon-bg
          title="まだしおりがありません"
          message="行き先やテーマを伝えるだけで、ぴったりのプランを提案します。"
        >
          <template #action>
            <UButton
              icon="i-lucide-pen-line"
              size="lg"
              @click="createShiori"
            >
              旅を計画する
            </UButton>
          </template>
        </AtomsEmptyState>
      </UCard>
    </div>

    <!-- しおり一覧グリッド -->
    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="shiori in shioris"
        :key="shiori.id"
        :to="`/shiori/${shiori.id}`"
        class="block h-full"
      >
      <UCard
        class="group relative h-full cursor-pointer transition-all hover:shadow-md hover:ring-1 hover:ring-amber-300 dark:hover:ring-amber-700"
      >
        <!-- 削除ボタン（ホバーで表示、オーナーのみ） -->
        <UButton
          v-if="shiori.owner_id === user?.id"
          icon="i-lucide-trash-2"
          variant="ghost"
          size="xs"
          aria-label="しおりを削除"
          class="absolute right-2 top-2 z-10 transition-opacity md:opacity-0 md:group-hover:opacity-100 hover:!text-error-500"
          @click="confirmDelete(shiori, $event)"
        />

        <!-- カバー画像 or グラデーション -->
        <div
          v-if="shiori.cover_image_url"
          class="mb-3 h-28 overflow-hidden rounded-lg bg-stone-100"
        >
          <img
            :src="shiori.cover_image_url"
            :alt="shiori.title"
            width="400"
            height="112"
            loading="lazy"
            class="size-full object-cover"
          >
        </div>
        <div
          v-else
          class="mb-3 flex h-28 items-center justify-center rounded-lg bg-gradient-to-br from-amber-50 to-stone-100 dark:from-amber-900/10 dark:to-stone-800/20"
        >
          <UIcon name="i-lucide-compass" class="size-10 text-amber-300 dark:text-amber-700" />
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
          <div class="flex items-center gap-1.5">
            <UBadge
              v-if="shiori.owner_id !== user?.id"
              variant="subtle"
              color="info"
              size="xs"
            >
              共同編集
            </UBadge>
            <UBadge
              v-if="shiori.is_public"
              variant="subtle"
              color="success"
              size="xs"
            >
              公開中
            </UBadge>
          </div>
          <span class="tabular-nums text-xs text-stone-400">
            {{ dayjs(shiori.updated_at).format('YYYY/MM/DD HH:mm') }} 更新
          </span>
        </div>
      </UCard>
      </NuxtLink>
    </div>
    <!-- 削除確認モーダル -->
    <AtomsConfirmModal
      v-model:show="showDeleteModal"
      title="しおりを削除"
      :description="`「${deleteTarget?.title}」を削除しますか？`"
      :loading="deleting"
      @confirm="deleteShiori"
    >
      <template #body>
        <p class="text-xs text-stone-400">
          日程・イベント・チャット履歴もすべて削除されます。この操作は取り消せません。
        </p>
      </template>
    </AtomsConfirmModal>
  </div>
</template>
