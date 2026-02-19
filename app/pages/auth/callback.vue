<script setup lang="ts">
// OAuth callback handler
// Supabase handles the token exchange automatically via detectSessionInUrl
const route = useRoute()
const { user, loading } = useAuth()

watch(
  [user, loading],
  ([newUser, isLoading]) => {
    if (isLoading) return

    if (newUser) {
      const redirect = (route.query.redirect as string) || '/dashboard'
      navigateTo(redirect)
    }
    else {
      navigateTo('/login?error=auth_failed')
    }
  },
  { immediate: true },
)
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
