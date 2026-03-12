---
description: 新規Vueコンポーネントを作成する
argument-hint: "[コンポーネントパス]"
---

# コンポーネント作成スキル

新規Vueコンポーネントを作成する際のワークフロー。
プロジェクトの `.claude/rules/vue-components.md` に準拠する。

## 使用方法

```
/create-component [レイヤー] [パス] [説明]
```

**例:**
```
/create-component atoms badge バッジコンポーネント
/create-component containers issue/priority 課題の優先度選択
/create-component section dashboard/summary ダッシュボードサマリー
```

---

## ワークフロー

### 1. レイヤーの確認

ユーザーに以下を確認:
- **atoms**: ドメイン知識なし、再利用可能なUIパーツ（ステートレス）
- **containers**: ドメイン知識あり、ページ横断で使用
- **section**: 特定ページ専用、ページ肥大化防止

**依存方向**: section → containers → atoms → Nuxt UI の一方向のみ。逆方向禁止。

### 2. ファイル構造の決定

**単一ファイル（シンプルな場合）:**
```
src/components/[layer]/[name].vue
```

**ディレクトリ（関連コンポーネントがある場合）:**
```
src/components/[layer]/[name]/
├── index.vue
└── [sub].vue
```

**命名**: ファイルパスからコンポーネント名が自動生成される: `atoms/form/item.vue` → `AtomsFormItem`

### 3. テンプレート生成

#### atoms テンプレート

Nuxt UIと同じprop名・値（`color`, `size`）を使用する。独自のマッピング関数は作成しない。

```vue
<template>
  <div>
    <slot />
  </div>
</template>

<script setup lang="ts">
interface Props {
  // Nuxt UI と同じ prop 名を使用
}

const props = defineProps<Props>()
const slots = useSlots()
</script>
```

#### containers テンプレート

```vue
<template>
  <div>
    <!-- atomsコンポーネントを使用 -->
  </div>
</template>

<script setup lang="ts">
import type { [Model] } from '@/models/[domain]'

interface Props {
  // ドメインモデルを受け取る
}

interface Emits {
  (e: 'saved', id: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// ストア・API
const api = useApi()

// フォームモデル（必要な場合）
const formModel = ref<FormModel>({})

// アクション
const handleSubmit = async (): Promise<void> => {
  // 処理
}
</script>
```

#### section テンプレート

```vue
<template>
  <AtomsWidget card title="タイトル">
    <div flex="~ col" gap="24px">
      <!-- containers + atoms を組み合わせ -->
    </div>
  </AtomsWidget>
</template>

<script setup lang="ts">
// ローカル状態
const selectedId = ref<string | undefined>(undefined)

// API
const api = useApi()
</script>
```

---

## コンポーネント設計ルール

### defineModel（双方向バインディング）

`defineModel` を使う。props + emit + computed getter/setter パターンや `useVModel` は使わない。

**必須:**
- 必ず名称付きで宣言する（名前なし・`modelValue` は禁止）
- defineModel で定義した prop/emit は defineProps/defineEmits から削除する
- Nuxt UIとの型差異（`undefined` vs `null` 等）は内部ブリッジ用 computed で対応

```typescript
// ✅ 正しい
const value = defineModel<string>('value', { default: '' })
const show = defineModel<boolean>('show', { default: false })

// ❌ 禁止
const modelValue = defineModel<string>()           // 名前なし
const modelValue = defineModel<string>('modelValue') // modelValue指定
const value = useVModel(props, 'value', emit)       // useVModel
```

### ナビゲーション

- テンプレート内リンク: `<NuxtLink>` または `<AtomsButton variant="link">`
- ロジック内遷移: `navigateTo()`
- `router.push()` は原則使用しない
- ユーザークリックだけで遷移する要素は `@click` + `navigateTo()` ではなくテンプレートで `<NuxtLink>` として実装

### emits

Props interface に `onXxx` 形式のコールバック関数を定義しない。イベントは `emit` を使用する。

### Hydration Mismatch 防止

`<ClientOnly>` や `v-show` への置き換えではなく、SSR/クライアント間でDOM構造が一致する根本対策を行う。

- Nuxt UI/Reka UIスロット内で `v-if`/`v-else` による異なるタグ型の切り替えを避ける → 単一要素 + クラス切り替え
- ブラウザ固有値（`Date.now()`, `window.innerWidth` 等）に依存する computed → 初期値を固定し `onMounted` 後に反映
- boolean props の判定に `=== false` を使わない（`!props.xxx` で `undefined` も処理）

---

### 4. 確認事項

- [ ] Props/Emitsの型定義
- [ ] 必要なimport（型のみ、Nuxt Auto-Import活用）
- [ ] 関連するコンポーネントの有無
- [ ] defineModel ルール準拠
- [ ] ナビゲーションルール準拠
- [ ] Hydration Mismatch がないか

---

## 出力形式

作成後、以下を報告:
1. 作成したファイルパス
2. 自動生成されるコンポーネント名（例: `AtomsColorTag`）
3. 使用例

### 5. ドキュメントの更新

コンポーネント作成後、`/update-component-doc` スキルを使用してドキュメントページを作成・更新する。
