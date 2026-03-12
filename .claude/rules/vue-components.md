# Vueコンポーネント作成ルール

## レイヤー構造と責務

```
section/          ← ページ固有コンポーネント（ページ肥大化防止）
  ↓ 依存
containers/       ← ドメイン知識を持つ汎用コンポーネント
  ↓ 依存
atoms/            ← ドメイン知識なし汎用UIパーツ（ステートレス）
  ↓ 依存
Nuxt UI / 外部ライブラリ
```

**依存方向の厳守**: 上位レイヤーから下位レイヤーへのみ依存可能。逆方向の依存は禁止。

### 命名規則

ファイルパスからコンポーネント名が自動生成される: `atoms/form/item.vue` → `AtomsFormItem`

---

## v-model（defineModel）ルール

双方向バインディングには `defineModel` を使用する（props + emit + computed getter/setter パターンは使わない）。

### 必須ルール

1. **必ず名称付きで宣言する** — `defineModel()` や `defineModel<T>()` のような名前なし（= `modelValue`）宣言は禁止
2. **`modelValue` を名前として使わない** — `modelValue` は事実上名称なしと同じ。具体的な名前（`value`, `show`, `checked` 等）を使用する
3. **defineModel で定義した prop/emit は defineProps/defineEmits から削除する** — 重複定義は禁止
4. Nuxt UIとの型の差異（`undefined` vs `null` 等）がある場合、内部ブリッジ用の computed を作成する

### アンチパターン

```typescript
// ❌ 名前なし（modelValue にマッピングされる）
const modelValue = defineModel<string>()

// ❌ modelValue を明示的に指定（事実上名前なし）
const modelValue = defineModel<string>('modelValue')

// ❌ props + emit + computed getter/setter パターン
const value = computed({
  get: () => props.value,
  set: (val) => emit('update:value', val),
})

// ❌ useVModel（@vueuse/core）
const value = useVModel(props, 'value', emit)
```

### 正しい使用例

```typescript
// ✅ 名称付き defineModel
const value = defineModel<string>('value', { default: '' })
const show = defineModel<boolean>('show', { default: false })
const checked = defineModel<boolean>('checked', { default: false })
```

---

## ナビゲーション（ルーティング）ルール

- **テンプレート内のリンク**: `<NuxtLink>` または `<AtomsButton variant="link">` を使用する
- **ロジック内の遷移**: `navigateTo()` を使用する
- `router.push()` は原則使用しない
- **テンプレート優先**: ユーザクリックで遷移するだけの要素は、`@click` + `navigateTo()` ではなくテンプレートで `<NuxtLink>` / `<AtomsButton variant="link">` として実装する。`navigateTo()` はフォーム送信後・条件分岐後など、ロジックを経由する必要がある場合にのみ使用する

---

## emitsルール

Props interfaceに `onXxx` 形式のコールバック関数を定義しない。イベントは `emit` を使用する。

---

## 共有ユーティリティ

### Nuxt UI APIへの準拠

Atoms層のコンポーネントは、Nuxt UIと同じprop名・値（`color`, `size`）を使用する。独自のマッピング関数は作成しない。

## Hydration Mismatchの防止

**原則**: `<ClientOnly>` や `v-show` への置き換えではなく、SSR/クライアント間でDOM構造が一致する根本対策を行う。

**主な対策:**
- Nuxt UI/Reka UIスロット内で `v-if`/`v-else` による異なるタグ型の切り替えを避ける → 単一要素 + クラス切り替え
- ブラウザ固有値（`Date.now()`, `window.innerWidth` 等）に依存する computed → 初期値を固定し `onMounted` 後に反映
- boolean propsの判定に `=== false` を使わない（`!props.xxx` で `undefined` も処理）

