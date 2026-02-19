export default defineNuxtRouteMiddleware((to) => {
  const { user, loading } = useAuth()

  // Wait for auth to initialize
  if (loading.value) return

  // Redirect to login if not authenticated
  if (!user.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
})
