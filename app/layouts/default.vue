<script setup lang="ts">
const { user, profile, signOut } = useAuth()
const route = useRoute()

const navigation = computed(() => [
  { label: 'ホーム', to: '/', icon: 'i-lucide-home' },
  { label: 'マイしおり', to: '/dashboard', icon: 'i-lucide-book-open' },
])

const userMenu = computed(() => [
  [
    { label: profile.value?.display_name || 'ユーザー', disabled: true },
  ],
  [
    { label: 'ログアウト', icon: 'i-lucide-log-out', click: signOut },
  ],
])
</script>

<template>
  <div class="min-h-screen bg-stone-50 dark:bg-stone-950">
    <!-- Header -->
    <header class="sticky top-0 z-50 border-b border-stone-200 bg-white/80 backdrop-blur-md dark:border-stone-800 dark:bg-stone-950/80">
      <div class="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center gap-2 text-lg font-bold text-orange-500">
          <UIcon name="i-lucide-map" class="size-6" />
          しおりっぷ
        </NuxtLink>

        <!-- Navigation -->
        <nav class="flex items-center gap-2">
          <template v-if="user">
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

            <UDropdownMenu :items="userMenu">
              <UAvatar
                :src="profile?.avatar_url || undefined"
                :alt="profile?.display_name || 'U'"
                size="sm"
                class="cursor-pointer"
              />
            </UDropdownMenu>
          </template>

          <template v-else>
            <UButton to="/login" variant="soft" size="sm">
              ログイン
            </UButton>
          </template>
        </nav>
      </div>
    </header>

    <!-- Main content -->
    <main>
      <slot />
    </main>
  </div>
</template>
