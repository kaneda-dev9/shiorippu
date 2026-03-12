<script setup lang="ts">
const route = useRoute()
const { authFetch } = useAuthFetch()
const { user, loading: authLoading } = useAuth()
const toast = useToast()

const token = route.params.token as string
const status = ref<'loading' | 'error' | 'redirecting'>('loading')
const errorMessage = ref<string>('')

async function acceptInvite() {
  status.value = 'loading'
  try {
    const result = await authFetch<{ shiori_id: string; already_member: boolean }>(`/api/invite/${token}`, {
      method: 'POST',
    })
    status.value = 'redirecting'
    if (result.already_member) {
      toast.add({ title: 'すでにメンバーです', color: 'info' })
    }
    else {
      toast.add({ title: '招待を受け入れました！', color: 'success' })
    }
    await navigateTo(`/shiori/${result.shiori_id}`)
  }
  catch (e: unknown) {
    status.value = 'error'
    const err = e as { data?: { statusMessage?: string } }
    errorMessage.value = err?.data?.statusMessage || '招待の受け入れに失敗しました。'
  }
}

// 認証状態を監視して処理
watch(
  [() => user.value, () => authLoading.value],
  ([currentUser, isLoading]) => {
    if (isLoading) return

    if (!currentUser) {
      // 未ログイン → ログインページへリダイレクト
      navigateTo(`/login?redirect=/invite/${token}`)
    }
    else {
      // ログイン済み → 招待を受け入れ
      acceptInvite()
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
    <!-- ローディング -->
    <div v-if="status === 'loading' || status === 'redirecting'" class="text-center">
      <UIcon name="i-lucide-loader-2" class="mb-4 size-10 animate-spin text-orange-500" />
      <p class="text-stone-600 dark:text-stone-400">
        {{ status === 'redirecting' ? 'リダイレクト中...' : '招待を処理中...' }}
      </p>
    </div>

    <!-- エラー -->
    <UCard v-else-if="status === 'error'" class="max-w-md">
      <div class="flex flex-col items-center text-center">
        <div class="mb-4 flex size-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <UIcon name="i-lucide-x-circle" class="size-8 text-red-500" />
        </div>
        <h2 class="mb-2 text-lg font-semibold text-stone-900 dark:text-stone-50">
          招待リンクエラー
        </h2>
        <p class="mb-6 text-sm text-stone-500">
          {{ errorMessage }}
        </p>
        <div class="flex gap-3">
          <UButton variant="outline" to="/dashboard">
            ダッシュボードへ
          </UButton>
          <UButton @click="acceptInvite">
            再試行
          </UButton>
        </div>
      </div>
    </UCard>
  </div>
</template>
