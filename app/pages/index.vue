<script setup lang="ts">
const { user } = useAuth()

const steps = [
  { title: 'AIに相談', description: '行き先やテーマを伝えるだけ。AIが最適なプランを提案します。' },
  { title: 'しおりを編集', description: 'ドラッグ&ドロップで簡単編集。みんなでリアルタイムに共同作業。' },
  { title: 'シェア&出発', description: 'おしゃれなしおりを共有して、旅に出かけよう！' },
]

const features = [
  {
    icon: 'i-lucide-sparkles',
    title: 'AIが旅をプランニング',
    description: '行き先・日程・テーマを選ぶだけで、AIがぴったりのプランを提案します。',
  },
  {
    icon: 'i-lucide-palette',
    title: 'おしゃれなしおり',
    description: '5種類のテンプレートで、旅の思い出を素敵にデザインできます。',
  },
  {
    icon: 'i-lucide-users',
    title: 'みんなで編集',
    description: 'リアルタイム共同編集で、旅の計画をみんなで作れます。',
  },
]
</script>

<template>
  <div>
    <!-- ヒーローセクション -->
    <section class="relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-br from-orange-50 via-amber-50 to-stone-50 dark:from-orange-950/30 dark:via-amber-950/20 dark:to-stone-950" />
      <div class="absolute -right-20 -top-20 size-80 rounded-full bg-orange-200/30 blur-3xl dark:bg-orange-800/10" />
      <div class="absolute -bottom-20 -left-20 size-80 rounded-full bg-amber-200/30 blur-3xl dark:bg-amber-800/10" />

      <div class="relative mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-4xl flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div class="mb-6 flex items-center gap-2 rounded-full bg-orange-100 px-4 py-1.5 text-sm font-medium text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
          <UIcon name="i-lucide-map" class="size-4" />
          <span>旅のしおり作成サービス</span>
        </div>

        <h1 class="mb-4 text-center text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl lg:text-6xl dark:text-stone-50">
          旅の計画を、
          <span class="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">もっと楽しく。</span>
        </h1>

        <p class="mb-8 max-w-lg text-center text-base text-stone-600 sm:text-lg dark:text-stone-400">
          AIと一緒にプランを練って、おしゃれなしおりを作ろう。
          みんなで編集して、最高の旅を。
        </p>

        <div class="flex flex-col items-center gap-3 sm:flex-row">
          <UButton
            v-if="user"
            to="/dashboard"
            size="xl"
            icon="i-lucide-book-open"
          >
            マイしおりを見る
          </UButton>
          <UButton
            v-else
            to="/login"
            size="xl"
            icon="i-lucide-sparkles"
          >
            無料ではじめる
          </UButton>
          <UButton
            variant="outline"
            size="xl"
            icon="i-lucide-play-circle"
            disabled
          >
            使い方を見る
          </UButton>
        </div>
      </div>
    </section>

    <!-- 特徴セクション -->
    <section class="border-t border-stone-200 bg-white py-16 sm:py-24 dark:border-stone-800 dark:bg-stone-950">
      <div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div class="mb-12 text-center">
          <h2 class="mb-3 text-2xl font-bold text-stone-900 sm:text-3xl dark:text-stone-50">
            しおりっぷの特徴
          </h2>
          <p class="text-stone-500">
            旅行計画をもっと簡単に、もっと楽しく
          </p>
        </div>

        <div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <UCard
            v-for="feature in features"
            :key="feature.title"
            class="text-center"
          >
            <div class="flex flex-col items-center gap-4">
              <div class="flex size-14 items-center justify-center rounded-2xl bg-orange-100 dark:bg-orange-900/30">
                <UIcon :name="feature.icon" class="size-7 text-orange-500" />
              </div>
              <div>
                <h3 class="mb-2 text-lg font-semibold text-stone-900 dark:text-stone-50">
                  {{ feature.title }}
                </h3>
                <p class="text-sm leading-relaxed text-stone-500">
                  {{ feature.description }}
                </p>
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </section>

    <!-- 使い方セクション -->
    <section class="border-t border-stone-200 bg-stone-50 py-16 sm:py-24 dark:border-stone-800 dark:bg-stone-900">
      <div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div class="mb-12 text-center">
          <h2 class="mb-3 text-2xl font-bold text-stone-900 sm:text-3xl dark:text-stone-50">
            かんたん3ステップ
          </h2>
          <p class="text-stone-500">
            誰でもすぐに始められます
          </p>
        </div>

        <div class="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div v-for="(step, index) in steps" :key="step.title" class="text-center">
            <div class="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-orange-500 text-lg font-bold text-white">
              {{ index + 1 }}
            </div>
            <h3 class="mb-2 font-semibold text-stone-900 dark:text-stone-50">
              {{ step.title }}
            </h3>
            <p class="text-sm text-stone-500">
              {{ step.description }}
            </p>
          </div>
        </div>

        <div class="mt-12 text-center">
          <UButton
            v-if="!user"
            to="/login"
            size="xl"
            icon="i-lucide-sparkles"
          >
            今すぐ始める
          </UButton>
          <UButton
            v-else
            to="/dashboard"
            size="xl"
            icon="i-lucide-plus"
          >
            新しいしおりを作る
          </UButton>
        </div>
      </div>
    </section>
  </div>
</template>
