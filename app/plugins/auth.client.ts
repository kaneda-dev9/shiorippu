export default defineNuxtPlugin({
  name: 'auth',
  dependsOn: ['supabase'],
  async setup() {
    const auth = useAuth()
    await auth.init()
  },
})
