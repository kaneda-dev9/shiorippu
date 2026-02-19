# コーディングスタイル

## 言語・フレームワーク

- TypeScript strict mode
- Vue 3 Composition API (`<script setup lang="ts">`)
- Nuxt v4 ディレクトリ構成 (`app/` 配下)

## 命名規則

| 対象 | ルール | 例 |
|------|--------|---|
| コンポーネント | PascalCase | `ShioriCard.vue`, `ChatChoiceCard.vue` |
| composable | camelCase, `use` prefix | `useAuth()`, `useShiori()` |
| ページ | kebab-case (Nuxt routing) | `pages/shiori/[id]/index.vue` |
| store | camelCase, `use` prefix + `Store` | `useShioriStore` |
| DB カラム | snake_case | `start_date`, `owner_id` |
| TS 型 | PascalCase | `Shiori`, `DayWithEvents` |
| CSS | Tailwind utility classes | `class="flex items-center gap-2"` |

## ファイル構成

- 1コンポーネント = 1ファイル
- composablesは機能単位で分割 (`useAuth`, `useShiori`, `useChat`)
- 型定義は `types/` に集約
- サーバーAPIは `server/api/` にRESTful配置

## Vue テンプレート

```vue
<script setup lang="ts">
// 1. imports (auto-importされないもの)
// 2. definePageMeta / defineProps / defineEmits
// 3. composables, refs
// 4. computed / watch
// 5. functions
// 6. lifecycle hooks
</script>

<template>
  <!-- 単一ルート要素推奨 -->
</template>
```

## Supabase クエリ

```typescript
// Good: select → filter → order → single
const { data, error } = await supabase
  .from('shioris')
  .select('*, days(*, events(*))')
  .eq('id', shioriId)
  .single()

// エラーハンドリングは必ず行う
if (error) throw error
```

## コミットメッセージ

```
feat: AIチャット画面に選択肢カードUIを追加
fix: ログインリダイレクトが正しく動かない問題を修正
refactor: useAuth composableを分離
chore: パッケージ更新
```

形式: `type: 日本語の簡潔な説明`
type: feat / fix / refactor / chore / docs / test / style
