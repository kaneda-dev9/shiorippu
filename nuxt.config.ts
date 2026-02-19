// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  future: {
    compatibilityVersion: 4,
  },

  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
  ],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    // Server-only
    supabaseServiceKey: '',
    claudeApiKey: '',
    // Public (exposed to client)
    public: {
      supabaseUrl: '',
      supabaseAnonKey: '',
      googleMapsApiKey: '',
      appUrl: 'http://localhost:3000',
    },
  },

  // Nuxt UI color configuration
  colorMode: {
    preference: 'light',
    fallback: 'light',
  },

  app: {
    head: {
      title: 'しおりっぷ - 旅のしおり作成サービス',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'AIと一緒に旅のプランを作って、おしゃれなしおりにしよう' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
    },
  },

  // Route rules
  routeRules: {
    '/shiori/**': { ssr: false }, // Editor is client-side only (heavy interactivity)
  },

  devtools: { enabled: true },
  compatibilityDate: '2025-01-01',
})
