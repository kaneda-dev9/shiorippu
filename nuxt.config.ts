// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  future: {
    compatibilityVersion: 4,
  },

  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    '@pinia/colada-nuxt',
    '@vueuse/nuxt',
    '@vite-pwa/nuxt',
    '@nuxt/eslint',
  ],

  css: ['~/assets/css/main.css'],

  icon: {
    provider: 'iconify',
  },

  runtimeConfig: {
    // Server-only
    supabaseServiceKey: '',
    claudeApiKey: '',
    googleClientId: '',
    googleClientSecret: '',
    tokenEncryptionKey: '',
    googleMapsServerApiKey: '',
    // Public (exposed to client)
    public: {
      supabaseUrl: '',
      supabaseAnonKey: '',
      googleMapsApiKey: '',
      googleMapsMapId: '',
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
        { name: 'theme-color', content: '#b45309' },
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
        { rel: 'icon', href: '/logo.svg', sizes: 'any', type: 'image/svg+xml' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon-180x180.png' },
      ],
    },
  },

  // Route rules
  routeRules: {
    '/dashboard': { ssr: false }, // 認証必須ページ — SSR時にauth未初期化でhydration mismatch防止
    '/shiori/**': { ssr: false }, // Editor is client-side only (heavy interactivity)
    '/fonts/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'しおりっぷ',
      short_name: 'しおりっぷ',
      description: 'AIと一緒に旅のプランを作って、おしゃれなしおりにしよう',
      lang: 'ja',
      theme_color: '#b45309',
      background_color: '#ffffff',
      display: 'standalone',
      icons: [
        { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html}'],
      globIgnores: ['covers/**', 'fonts/**'],
      runtimeCaching: [],
    },
    devOptions: {
      enabled: false,
    },
  },

  // Vercel デプロイ設定
  nitro: {
    vercel: {
      functions: {
        maxDuration: 60, // AIチャットのSSEストリーミング用（デフォルト10秒では不足）
      },
    },
  },

  vite: {
    optimizeDeps: {
      // dev サーバー初回実行時のページリロード抑止のため、実行時に検出される依存を pre-bundle
      include: [
        'jspdf',
        '@supabase/supabase-js',
        'dayjs',
        'dayjs/locale/ja',
        'vue-draggable-plus',
        '@internationalized/date',
        'zod',
        'marked',
        'dompurify',
        'ai',
        '@ai-sdk/vue',
        '@googlemaps/js-api-loader',
      ],
    },
  },

  devtools: { enabled: true },
  compatibilityDate: '2025-01-01',
})
