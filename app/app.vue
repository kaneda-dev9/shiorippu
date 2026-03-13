<script setup lang="ts">
import { ja } from '@nuxt/ui/locale'
</script>

<template>
  <UApp :locale="ja">
    <NuxtPwaManifest />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
