---
description: 新規composableを作成する
argument-hint: "[composable名]"
---

# Composable作成スキル

新規composableを作成する際のワークフロー。
プロジェクトの `.claude/rules/composables.md` に準拠する。

## 使用方法

```
/create-composable [名前] [説明]
```

**例:**
```
/create-composable pagination ページネーション管理
/create-composable clipboard クリップボード操作
/create-composable debounce デバウンス処理
```

---

## ワークフロー

### 1. 要件の確認

ユーザーに以下を確認:
- 入力パラメータ（Ref/プリミティブ/オプション）
- 戻り値（単一値/オブジェクト/void）
- リアクティブ性の要件
- クリーンアップ処理の必要性

### 2. ファイル作成

```
src/composables/[camelCase名].ts
```

**命名規則:**

| 対象 | 規則 | 例 |
|------|------|-----|
| ファイル名 | camelCase | `postcodeLocation.ts` |
| 関数名 | `use` + PascalCase | `usePostcodeLocation()` |
| 戻り値の型 | PascalCase + Result/Options | `PostcodeLocationResult` |

### 3. テンプレート生成

#### シンプルなcomposable

```typescript
/**
 * [説明]
 */
export const use[Name] = () => {
  // 実装
  return result
}
```

#### リアクティブな状態を返すcomposable

公開インターフェースはファイル冒頭で export し、内部型は export しない。
Ref と戻り値の型を明示的に定義する。

```typescript
// 公開インターフェース
export interface [Name]Result {
  data: Ref<[Type]>
  loading: Ref<boolean>
  error: Ref<string | undefined>
}

// 内部型（exportしない）
interface FetchParams {
  // ...
}

/**
 * [説明]
 * @param [param] - [パラメータ説明]
 */
export function use[Name](
  [param]: Ref<[Type]>,
): [Name]Result {
  const data = ref<[Type]>([初期値])
  const loading = ref<boolean>(false)
  const error = ref<string | undefined>(undefined)

  watch([param], async (val) => {
    try {
      loading.value = true
      error.value = undefined
      data.value = await fetch[Name](val)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      console.error(e)
    } finally {
      loading.value = false
    }
  })

  return {
    data,
    loading,
    error,
  }
}
```

#### クリーンアップが必要なcomposable

イベントリスナーやタイマーなど、破棄時にクリーンアップが必要な場合は `tryOnScopeDispose`（`@vueuse/shared`）を使用する。

```typescript
import { tryOnScopeDispose } from '@vueuse/core'

export function use[Name](): [Name]Result {
  const intervalId = ref<ReturnType<typeof setInterval>>()

  const start = () => {
    intervalId.value = setInterval(() => {
      // 処理
    }, 1000)
  }

  const stop = () => {
    if (intervalId.value) {
      clearInterval(intervalId.value)
      intervalId.value = undefined
    }
  }

  // スコープ破棄時に自動クリーンアップ
  tryOnScopeDispose(stop)

  return { start, stop }
}
```

#### ジェネリック型を使うcomposable

```typescript
/**
 * [説明]
 * @template T - [型パラメータ説明]
 */
export function use[Name]<T = any>(
  options?: [Name]Options<T>,
): [Name]Result<T> {
  // 実装
}
```

#### 複数バリアントを提供するcomposable

```typescript
// 基本版
export function use[Name](
  value: Ref<[Type]>,
): [Name]Result {
  // 基本実装
}

// フォーム統合版
export function use[Name]Form(
  formValue: Ref<any>,
  fieldKey: string,
): [Name]Result {
  const value = computed<[Type]>(() => formValue.value[fieldKey])
  return use[Name](value)
}
```

### 4. 確認事項

- [ ] ファイル名が camelCase
- [ ] 関数名が `use` + PascalCase
- [ ] 戻り値の型が明示されている（`[Name]Result`）
- [ ] Ref の型が明示されている（`ref<boolean>(false)`, `computed<CSSProperties>(() => ...)`）
- [ ] 公開インターフェースがファイル冒頭で export されている
- [ ] 内部型は export されていない
- [ ] JSDocコメントがある
- [ ] エラーハンドリングが適切
- [ ] クリーンアップ処理に `tryOnScopeDispose` を使用（必要な場合）

---

## VueUse活用の判断

以下の場合はVueUseの使用を検討:
- ブラウザAPI（localStorage, clipboard, etc.）
- イベントリスナー
- デバウンス/スロットル
- 要素の監視（resize, intersection, etc.）

```typescript
// VueUseの再エクスポート例
export { useLocalStorage } from '@vueuse/core'

// VueUseを拡張する例
import { useDebounceFn } from '@vueuse/core'

export function useSearchDebounce(
  searchFn: () => Promise<void>,
  delay: number = 300,
) {
  return useDebounceFn(searchFn, delay)
}
```

---

## 出力形式

作成後、以下を報告:
1. 作成したファイルパス
2. エクスポートされる関数名
3. 使用例

```typescript
// 使用例
const { data, loading } = use[Name](someRef)
```
