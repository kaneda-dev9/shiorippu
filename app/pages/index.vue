<script setup lang="ts">
const { user } = useAuth()
</script>

<template>
  <div class="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4">
    <!-- Hero Section -->
    <div class="mx-auto max-w-2xl text-center">
      <div class="mb-6 text-6xl">
        ✈️
      </div>
      <h1 class="mb-4 text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
        旅の計画を、もっと楽しく。
      </h1>
      <p class="mb-8 text-lg text-stone-500 dark:text-stone-400">
        AIと一緒にプランを練って、おしゃれなしおりを作ろう。<br>
        みんなで編集して、最高の旅を。
      </p>

      <div class="flex items-center justify-center gap-3">
        <UButton
          v-if="user"
          to="/dashboard"
          size="lg"
          icon="i-lucide-book-open"
        >
          マイしおり
        </UButton>
        <UButton
          v-else
          to="/login"
          size="lg"
          icon="i-lucide-sparkles"
        >
          はじめる
        </UButton>
      </div>

      <!-- Features -->
      <div class="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
        <div class="text-center">
          <div class="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/30">
            <UIcon name="i-lucide-sparkles" class="size-6 text-orange-500" />
          </div>
          <h3 class="mb-1 font-semibold text-stone-900 dark:text-stone-50">
            AIが旅をプランニング
          </h3>
          <p class="text-sm text-stone-500">
            行き先・日程・テーマを選ぶだけで<br>
            AIがぴったりのプランを提案
          </p>
        </div>

        <div class="text-center">
          <div class="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/30">
            <UIcon name="i-lucide-palette" class="size-6 text-orange-500" />
          </div>
          <h3 class="mb-1 font-semibold text-stone-900 dark:text-stone-50">
            おしゃれなしおり
          </h3>
          <p class="text-sm text-stone-500">
            5種類のテンプレートで<br>
            旅の思い出を素敵にデザイン
          </p>
        </div>

        <div class="text-center">
          <div class="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/30">
            <UIcon name="i-lucide-users" class="size-6 text-orange-500" />
          </div>
          <h3 class="mb-1 font-semibold text-stone-900 dark:text-stone-50">
            みんなで編集
          </h3>
          <p class="text-sm text-stone-500">
            リアルタイム共同編集で<br>
            旅の計画をみんなで作れる
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
