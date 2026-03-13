<script setup lang="ts">
// OAuth PKCE callback handler
// detectSessionInUrl: true により Supabase SDK が自動で code 交換する
// ここでは結果の session を取得してリダイレクトする
const route = useRoute()
const supabase = useSupabase()
const { init } = useAuth()

onMounted(async () => {
  try {
    if (!route.query.code) {
      await navigateTo('/login?error=auth_failed')
      return
    }

    // SDK の自動 code 交換が完了するまでポーリング
    const MAX_RETRIES = 25
    const RETRY_INTERVAL_MS = 200
    let session = null
    for (let i = 0; i < MAX_RETRIES; i++) {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        session = data.session
        break
      }
      await new Promise(r => setTimeout(r, RETRY_INTERVAL_MS))
    }

    if (!session) {
      console.error('Auth callback: session not available after waiting')
      await navigateTo('/login?error=auth_failed')
      return
    }

    // 認証状態を再初期化
    await init()

    // Google provider_refresh_token が返された場合、DBに保存
    if (session.provider_refresh_token) {
      try {
        await $fetch('/api/auth/save-google-token', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: { refreshToken: session.provider_refresh_token },
        })
      }
      catch (e) {
        console.error('Failed to save Google refresh token:', e)
      }
    }

    // オープンリダイレクト防止: 相対パスのみ許可
    const rawRedirect = (route.query.redirect as string) || '/dashboard'
    const redirect = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/dashboard'
    const calendarConnected = route.query.calendar_connected === 'true'

    if (calendarConnected && redirect) {
      const separator = redirect.includes('?') ? '&' : '?'
      await navigateTo(`${redirect}${separator}calendar_connected=true`)
    }
    else {
      await navigateTo(redirect)
    }
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
