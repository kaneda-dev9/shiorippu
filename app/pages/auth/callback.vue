<script setup lang="ts">
// OAuth PKCE callback handler
const route = useRoute()
const supabase = useSupabase()
const { init } = useAuth()

onMounted(async () => {
  try {
    const code = route.query.code as string

    if (!code) {
      await navigateTo('/login?error=auth_failed')
      return
    }

    // PKCE: codeをセッションに交換
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('Auth callback error:', error)
      await navigateTo('/login?error=auth_failed')
      return
    }

    // 認証状態を再初期化
    await init()

    const redirect = (route.query.redirect as string) || '/dashboard'
    await navigateTo(redirect)
  }
  catch (e) {
    console.error('Auth callback unexpected error:', e)
    await navigateTo('/login?error=auth_failed')
  }
})
</script>

<template>
  <div class="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
    <div class="text-center">
      <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-orange-500" />
      <p class="mt-4 text-sm text-stone-500">
        ログイン中...
      </p>
    </div>
  </div>
</template>
