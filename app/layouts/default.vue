<script setup lang="ts">
const { user, profile, signOut } = useAuth()
const route = useRoute()

// モバイルメニュー開閉状態
const mobileMenuOpen = ref(false)

// ナビゲーション項目
const navigation = computed(() => [
  { label: 'ホーム', to: '/', icon: 'i-lucide-home' },
  ...(user.value
    ? [{ label: 'マイしおり', to: '/dashboard', icon: 'i-lucide-book-open' }]
    : []),
])

// ユーザーメニュー項目
const userMenuItems = computed(() => [
  [
    {
      label: profile.value?.display_name || 'ユーザー',
      icon: 'i-lucide-user',
      disabled: true,
    },
  ],
  [
    {
      label: 'ログアウト',
      icon: 'i-lucide-log-out',
      click: () => signOut(),
    },
  ],
])

// ルート変更時にモバイルメニューを閉じる
watch(() => route.path, () => {
  mobileMenuOpen.value = false
})
</script>

<template>
  <div class="flex h-dvh flex-col overflow-hidden bg-stone-50 dark:bg-stone-950">
    <!-- ヘッダー -->
    <header class="sticky top-0 z-50 border-b border-stone-200 bg-white/80 backdrop-blur-md dark:border-stone-800 dark:bg-stone-950/80">
      <div class="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <!-- ロゴ -->
        <NuxtLink
          to="/"
          class="flex items-center gap-2 text-lg font-bold text-orange-500"
        >
          <UIcon name="i-lucide-map" class="size-6" />
          <span>しおりっぷ</span>
        </NuxtLink>

        <!-- ナビゲーション（認証状態依存のためクライアントのみ） -->
        <ClientOnly>
          <nav class="hidden items-center gap-1 md:flex">
            <UButton
              v-for="item in navigation"
              :key="item.to"
              :to="item.to"
              :icon="item.icon"
              :variant="route.path === item.to ? 'soft' : 'ghost'"
              size="sm"
            >
              {{ item.label }}
            </UButton>

            <!-- ログイン済み: ユーザーメニュー -->
            <template v-if="user">
              <USeparator orientation="vertical" class="mx-2 h-5" />
              <UDropdownMenu :items="userMenuItems">
                <UButton variant="ghost" size="sm" class="gap-2">
                  <UAvatar
                    :src="profile?.avatar_url || undefined"
                    :alt="profile?.display_name || 'U'"
                    size="2xs"
                  />
                  <span class="hidden text-sm font-medium lg:inline">
                    {{ profile?.display_name || 'ユーザー' }}
                  </span>
                  <UIcon name="i-lucide-chevron-down" class="size-3.5 text-stone-400" />
                </UButton>
              </UDropdownMenu>
            </template>

            <!-- 未ログイン: ログインボタン -->
            <template v-else>
              <UButton
                to="/login"
                icon="i-lucide-log-in"
                size="sm"
              >
                ログイン
              </UButton>
            </template>
          </nav>

          <!-- モバイル: ハンバーガーメニューボタン -->
          <UButton
            class="md:hidden"
            variant="ghost"
            size="sm"
            :icon="mobileMenuOpen ? 'i-lucide-x' : 'i-lucide-menu'"
            aria-label="メニュー"
            @click="mobileMenuOpen = true"
          />
        </ClientOnly>
      </div>
    </header>

    <!-- モバイルメニュー -->
    <USlideover v-model:open="mobileMenuOpen" side="right" title="メニュー">
      <template #body>
        <nav class="flex flex-col gap-1">
          <UButton
            v-for="item in navigation"
            :key="item.to"
            :to="item.to"
            :icon="item.icon"
            :variant="route.path === item.to ? 'soft' : 'ghost'"
            size="lg"
            block
            class="justify-start"
          >
            {{ item.label }}
          </UButton>

          <USeparator class="my-3" />

          <template v-if="user">
            <div class="flex items-center gap-3 rounded-lg px-3 py-2">
              <UAvatar
                :src="profile?.avatar_url || undefined"
                :alt="profile?.display_name || 'U'"
                size="sm"
              />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-stone-900 dark:text-stone-50">
                  {{ profile?.display_name || 'ユーザー' }}
                </p>
              </div>
            </div>

            <UButton
              icon="i-lucide-log-out"
              variant="ghost"
              color="error"
              size="lg"
              block
              class="justify-start"
              @click="signOut()"
            >
              ログアウト
            </UButton>
          </template>

          <template v-else>
            <UButton
              to="/login"
              icon="i-lucide-log-in"
              size="lg"
              block
            >
              ログイン
            </UButton>
          </template>
        </nav>
      </template>
    </USlideover>

    <!-- メインコンテンツ -->
    <main class="min-h-0 flex-1 overflow-y-auto">
      <slot />
    </main>

  </div>
</template>
