export default defineNuxtRouteMiddleware(() => {
  const { user, loading } = useAuth()

  if (loading.value) return

  // Redirect to dashboard if already logged in
  if (user.value) {
    return navigateTo('/dashboard')
  }
})
