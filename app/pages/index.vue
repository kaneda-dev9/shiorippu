<template>
  <div>
    <!-- ヒーローセクション -->
    <section class="bg-kinari">
      <div class="relative mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-3xl flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <p class="mb-6 text-sm tracking-widest text-amber-700 uppercase dark:text-amber-500">旅のしおり作成サービス</p>

        <h1 class="mb-4 text-center text-4xl font-display tracking-tight text-stone-800 sm:text-5xl lg:text-6xl dark:text-stone-100">
          旅の計画を、もっと楽しく。
        </h1>

        <p class="mb-10 max-w-lg text-center text-base leading-relaxed text-stone-600 sm:text-lg dark:text-stone-400">
          テーマを伝えて、プランを練って、おしゃれなしおりを作ろう。
          みんなで編集して、最高の旅を。
        </p>

        <ClientOnly>
          <div class="flex flex-col items-center gap-3 sm:flex-row">
            <UButton
              v-if="user"
              to="/dashboard"
              size="xl"
              color="neutral"
              variant="solid"
              icon="i-lucide-book-open"
            >
              マイしおりを見る
            </UButton>
            <UButton
              v-else
              to="/login"
              size="xl"
              color="neutral"
              variant="solid"
              icon="i-lucide-pen-line"
            >
              無料ではじめる
            </UButton>
          </div>
          <template #fallback>
            <div class="flex flex-col items-center gap-3 sm:flex-row">
              <UButton
                to="/login"
                size="xl"
                color="neutral"
                variant="solid"
                icon="i-lucide-pen-line"
              >
                無料ではじめる
              </UButton>
            </div>
          </template>
        </ClientOnly>

        <div class="mt-16 flex items-center gap-4 text-stone-300 dark:text-stone-700">
          <div class="h-px w-12 bg-current" />
          <UIcon name="i-lucide-compass" class="size-4" />
          <div class="h-px w-12 bg-current" />
        </div>
      </div>
    </section>

    <!-- 特徴セクション -->
    <section class="border-t border-stone-200 bg-white py-20 sm:py-28 dark:border-stone-800 dark:bg-stone-950">
      <div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div class="mb-16 text-center">
          <p class="mb-3 text-sm tracking-widest text-teal-600 uppercase dark:text-teal-400">Features</p>
          <h2 class="mb-3 text-2xl font-display text-stone-800 sm:text-3xl dark:text-stone-100">
            しおりっぷの特徴
          </h2>
          <p class="text-stone-500">
            旅行計画をもっと簡単に、もっと楽しく
          </p>
        </div>

        <div class="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="feature in features" :key="feature.title" class="group text-center">
            <div class="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-stone-200 transition-colors group-hover:border-amber-300 group-hover:bg-amber-50 dark:border-stone-700 dark:group-hover:border-amber-700 dark:group-hover:bg-amber-900/20">
              <UIcon :name="feature.icon" class="size-5 text-stone-500 transition-colors group-hover:text-amber-700 dark:text-stone-400 dark:group-hover:text-amber-400" />
            </div>
            <h3 class="mb-2 text-sm font-semibold tracking-wide text-stone-800 dark:text-stone-200">{{ feature.title }}</h3>
            <p class="text-sm leading-relaxed text-stone-500 dark:text-stone-400">{{ feature.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 使い方セクション -->
    <section class="border-t border-stone-200 bg-stone-50 py-20 sm:py-28 dark:border-stone-800 dark:bg-stone-900">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div class="mb-16 text-center">
          <p class="mb-3 text-sm tracking-widest text-teal-600 uppercase dark:text-teal-400">How it works</p>
          <h2 class="mb-3 text-2xl font-display text-stone-900 sm:text-3xl dark:text-stone-50">
            かんたん3ステップ
          </h2>
          <p class="text-stone-500">
            誰でもすぐに始められます
          </p>
        </div>

        <div class="flex flex-col gap-12 sm:gap-14">
          <div v-for="(step, index) in steps" :key="step.title" class="flex items-start gap-5">
            <div class="flex flex-col items-center">
              <div class="flex size-10 shrink-0 items-center justify-center rounded-full border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/30">
                <UIcon :name="step.icon" class="size-4.5 text-amber-700 dark:text-amber-400" />
              </div>
              <div v-if="index < steps.length - 1" class="mt-2 h-10 w-px bg-stone-200 sm:h-14 dark:bg-stone-700" />
            </div>
            <div class="pt-1">
              <h3 class="mb-1 text-base font-semibold text-stone-800 dark:text-stone-100">{{ step.title }}</h3>
              <p class="text-sm leading-relaxed text-stone-500 dark:text-stone-400">{{ step.description }}</p>
            </div>
          </div>
        </div>

        <div class="mt-12 text-center">
          <ClientOnly>
            <UButton
              v-if="!user"
              to="/login"
              size="xl"
              color="neutral"
              variant="solid"
              icon="i-lucide-pen-line"
            >
              今すぐ始める
            </UButton>
            <UButton
              v-else
              to="/dashboard"
              size="xl"
              color="neutral"
              variant="solid"
              icon="i-lucide-plus"
            >
              新しいしおりを作る
            </UButton>
            <template #fallback>
              <UButton
                to="/login"
                size="xl"
                color="neutral"
                variant="solid"
                icon="i-lucide-pen-line"
              >
                今すぐ始める
              </UButton>
            </template>
          </ClientOnly>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const { user } = useAuth()

const steps = [
  { icon: 'i-lucide-pen-line', title: 'テーマを伝える', description: '行き先や旅のテーマを伝えるだけ。ぴったりのプランを一緒に考えます。' },
  { icon: 'i-lucide-layout-list', title: 'しおりを編集', description: 'ドラッグ&ドロップで簡単編集。みんなでリアルタイムに共同作業。' },
  { icon: 'i-lucide-send', title: 'シェア&出発', description: 'おしゃれなしおりを共有して、旅に出かけよう！' },
]

const features = [
  {
    icon: 'i-lucide-compass',
    title: 'プランニング',
    description: '行き先・日程・テーマを選ぶだけで、ぴったりのプランを提案します。',
  },
  {
    icon: 'i-lucide-image',
    title: 'おしゃれなしおり',
    description: 'カバー画像を設定して、旅の思い出を素敵にデザインできます。',
  },
  {
    icon: 'i-lucide-users',
    title: 'みんなで編集',
    description: 'リアルタイム共同編集で、旅の計画をみんなで作れます。',
  },
  {
    icon: 'i-lucide-map-pin',
    title: 'マップで確認',
    description: '登録したスポットを地図上で一覧表示。ルートもひと目でわかります。',
  },
  {
    icon: 'i-lucide-file-down',
    title: 'PDF出力',
    description: 'しおりをPDFとしてダウンロード。オフラインでも旅のお供に。',
  },
  {
    icon: 'i-lucide-calendar-plus',
    title: 'カレンダー連携',
    description: '旅行プランをGoogleカレンダーにワンクリックで登録できます。',
  },
]
</script>
