---
description: プロジェクトのコーディング規則に基づいてコードの一貫性を検証・修正する
argument-hint: "[カテゴリ: defineModel | styling | composables | layer-deps | navigation | hydration | props-interface]"
---

# リファクタスキル

プロジェクトのコーディング規則・慣習・アーキテクチャに基づいて、コードの一貫性を検証・修正するワークフロー。
全ファイルを一律スキャンするのではなく、各チェック項目に関連するディレクトリ・パターンのみを対象とする。

## 使用方法

```
/refactor [対象カテゴリ（省略時は全カテゴリ）]
```

**例:**
```
/refactor                    # 全カテゴリをチェック
/refactor defineModel        # defineModel 統一のみ
/refactor styling            # UnoCSS スタイリングのみ
/refactor composables        # Composable 規約のみ
```

---

## 対象ファイルの特定

チェック対象は **現在のユーザーが変更したファイルのみ** に絞る。以下の手順で特定する。

### 手順

1. **現在のブランチとベースブランチ（develop）の差分からファイル一覧を取得**
2. **非マージコミットかつ現在のユーザーのコミットのみに絞る**
   ```bash
   # 現在の git ユーザー名を取得
   AUTHOR=$(git config user.name)
   # ユーザーのコミットで変更されたファイルのみ抽出
   git log develop..HEAD --no-merges --author="$AUTHOR" --format="%H" \
     | xargs -I{} git diff-tree --no-commit-id --name-only -r {} \
     | sort -u | grep -E '\.(vue|ts)$'
   ```
3. **上記で得られたファイル一覧を、各カテゴリのチェック対象として使用する**

ユーザーから特定のコミット範囲が指示された場合は、その範囲に従う。

---

## カテゴリ一覧

| カテゴリ | チェック対象ディレクトリ | 概要 |
|---|---|---|
| `defineModel` | `src/components/` | 双方向バインド定義の統一 |
| `styling` | `src/components/`, `src/pages/` | UnoCSS / スタイリング規約 |
| `composables` | `src/composables/` | Composable 規約 |
| `layer-deps` | `src/components/` | レイヤー依存方向 |
| `navigation` | `src/components/`, `src/pages/` | ルーティング規約 |
| `hydration` | `src/components/` | Hydration Mismatch 防止 |
| `props-interface` | `src/components/` | Props / emits 規約 |

---

## チェック項目の詳細

各チェックでは Claude Code の **Grep ツール** を使用する（bash の grep コマンドは使わない）。
検索対象は「対象ファイルの特定」で得られたファイル一覧に限定する。

### 1. defineModel（双方向バインド統一）

**対象**: 対象ファイルのうち `src/components/**/*.vue`
**参照ルール**: `.claude/rules/vue-components.md` > v-model（defineModel）ルール

#### 検索パターン

| パターン | 検索する正規表現 | glob |
|---|---|---|
| useVModel の使用 | `useVModel` | `*.vue` |
| 名前なし defineModel | `defineModel\(\)` | `*.vue` |
| modelValue 名の defineModel | `defineModel.*'modelValue'` | `*.vue` |
| emit('update:...') パターン | `emit\(['"]update:` | `*.vue` |

`emit('update:...')` が検出された場合、同一ファイルに対応する `defineModel` 宣言があるか確認する。

#### 修正方針

- `useVModel` → `defineModel` に置き換え
- `defineModel()` / `defineModel('modelValue')` → 具体名（`'value'`, `'show'` 等）に変更
- props + emit + computed getter/setter → `defineModel` に一本化
- defineModel 化した prop/emit は defineProps/defineEmits から削除

---

### 2. styling（UnoCSS / スタイリング規約）

**対象**: 対象ファイルのうち `src/components/**/*.vue`, `src/pages/**/*.vue`
**参照ルール**: `.claude/rules/styling.md`

> lint で検証可能な項目（`local/unocss-*`）は `pnpm lint` で網羅されるため、このスキルでは lint でカバーされない項目のみを対象とする。

#### 検索パターン

| パターン | 検索する正規表現 | glob | 備考 |
|---|---|---|---|
| margin でのスペーシング | `\s(m\|mx\|my\|mt\|mr\|mb\|ml)="[^"]*"` | `*.vue` | 下記の除外ルール参照 |
| flex direction 省略 | `flex="~"` | `*.vue` | `flex="~ row"` or `flex="~ col"` に |
| 100% → full | `(w\|h)="100%"` | `*.vue` | `"full"` に統一 |
| gap の単位なし | `gap="[0-9]+[^px"]` | `*.vue` | px 指定必須（`gap="0"` は除外） |
| computed で動的クラス | `computed.*=>.*\`.*\$\{` | `*.vue` | `:style` + CSSProperties 推奨 |

#### margin の除外ルール（誤検出防止）

以下の margin 使用は **違反ではない**ため、検出結果から除外する：

- **`m="0"` / `m="y-0"` / `m="x-0"` 等のリセット** — ブラウザデフォルトの margin をリセットする目的（`<p>`, `<h1>` 等）
- **`m="l-auto"` / `m="r-auto"` / `m="t-auto"`** — flexbox 内の配置制御（push-to-end パターン）
- **`m="x-auto"`** — 中央寄せパターン
- **外部ライブラリの制約による margin** — コメントで理由が記載されている場合

違反として報告するのは、**兄弟要素間のスペーシング目的で使われている margin** のみ（親要素に `flex` + `gap` を設定すべきケース）。

---

### 3. composables（Composable 規約）

**対象**: 対象ファイルのうち `src/composables/**/*.ts`
**参照ルール**: `.claude/rules/composables.md`

#### 検索パターン

| パターン | 検索する正規表現 | 備考 |
|---|---|---|
| 関数命名規則 | `export function\|export const` | `useXxxYyy` 形式か確認 |
| 戻り値の型命名 | `export interface\|export type` | composable の戻り値型は `XxxResult` / `XxxOptions` 形式。ただしデータ構造の型定義はこの規則の対象外 |
| Ref に型注釈なし | `ref\(` | `ref<Type>()` 形式か確認 |
| computed に型注釈なし | `computed\(` | `computed<Type>()` 形式か確認 |
| クリーンアップ漏れ | `addEventListener\|setInterval\|setTimeout` | `tryOnScopeDispose` で後処理されているか |

#### composable の命名判定ルール

`export function` が `use` prefix を持たない場合でも、以下のケースは **違反ではない**：

- **ユーティリティ関数**（reactive な状態を持たず、composable ではないもの）→ ただし `src/composables/` に置くべきかは要検討
- **composable 内部で使われるヘルパー関数**（ファイル外から呼ばれない場合は export を外すことを推奨）

---

### 4. layer-deps（レイヤー依存方向）

**対象**: 対象ファイルのうち `src/components/atoms/`, `src/components/containers/`
**参照ルール**: `.claude/rules/vue-components.md` > レイヤー構造と責務

#### 検索パターン

| パターン | 検索する正規表現 | 対象ディレクトリ |
|---|---|---|
| atoms → containers/section | `containers/\|section/` | `src/components/atoms/` |
| atoms → コンポーネント名 | `Containers[A-Z]\|Section[A-Z]` | `src/components/atoms/` |
| containers → section | `section/` | `src/components/containers/` |
| containers → コンポーネント名 | `Section[A-Z]` | `src/components/containers/` |

---

### 5. navigation（ルーティング規約）

**対象**: 対象ファイルのうち `src/components/**/*.vue`, `src/pages/**/*.vue`
**参照ルール**: `.claude/rules/vue-components.md` > ナビゲーションルール

#### 検索パターン

| パターン | 検索する正規表現 |
|---|---|
| router.push/replace | `router\.push\|router\.replace` |
| @click + navigateTo | `navigateTo` |

#### 判定基準

**原則: `@click` ハンドラ内で遷移以外のロジック（API呼び出し、状態更新、ダイアログ制御等）が挟まる場合は対象外。** 純粋にクリック → ページ遷移のみの箇所だけを NuxtLink に置き換える。

NuxtLink に **置き換えるべき** ケース:
- `<div @click="navigateTo('/path')">` — 単純なページ遷移
- `<button @click="goToDetail(id)">` — 関数内で `navigateTo()` するだけ
- `<tr @click="navigateTo(...)">` — テーブル行クリックでの遷移

navigateTo() の **ままで良い** ケース（ロジックが挟まる）:
- API呼び出し後に遷移（`await api.save(); navigateTo(...)`）
- 条件分岐後に遷移先が変わる（`if (isNew) navigateTo(...) else navigateTo(...)`）
- 状態更新を伴う（`store.reset(); navigateTo(...)`）
- ダイアログを閉じてから遷移するなど、副作用を伴う場合

---

### 6. hydration（Hydration Mismatch 防止）

**対象**: 対象ファイルのうち `src/components/**/*.vue`
**参照ルール**: `.claude/rules/vue-components.md` > Hydration Mismatch の防止

#### 検索パターン

| パターン | 検索する正規表現 | 備考 |
|---|---|---|
| ブラウザ固有値 | `Date\.now\(\)\|window\.\|document\.\|navigator\.` | onMounted 内 or イベントハンドラ内なら OK |
| === false | `=== false` | `!props.xxx` に変更 |

#### 除外ルール（誤検出防止）

以下は **違反ではない**：
- **イベントハンドラ（onClick 等）内** での `window.` / `navigator.` / `document.` 使用 — ユーザー操作時のみ実行されるため SSR に影響しない
- **onMounted / onBeforeMount 内** での使用 — クライアントサイドでのみ実行される

---

### 7. props-interface（Props / emits 規約）

**対象**: 対象ファイルのうち `src/components/**/*.vue`
**参照ルール**: `.claude/rules/vue-components.md` > emitsルール

#### 検索パターン

| パターン | 検索する正規表現 | 備考 |
|---|---|---|
| Props に onXxx コールバック | `on[A-Z]\w*\s*[?:]\s*\(` | `interface Props` / `defineProps` 内のみ対象。データオブジェクト内の onClick 等は除外 |
| 独自 prop マッピング関数 | `mapColor\|mapSize\|mapVariant\|toNuxtUi\|convertColor` | atoms 層のみ |

> `defineProps` を `const props =` で受け取る規約と、テンプレートでの `props.xxx` アクセスは ESLint ルール `local/vue-require-props-variable` でカバー済み。

---

## ワークフロー

### 全カテゴリ実行時

1. **対象ファイルを特定** — 「対象ファイルの特定」セクションに従い、チェック対象のファイル一覧を取得する

2. **lint + typecheck を先に実行** — 機械的に検出可能な違反を洗い出す
   ```bash
   pnpm lint
   pnpm typecheck
   ```
   ルール別のエラー件数を確認し、lint で解決すべきものは lint --fix 適用後に残ったもののみ対応する。

3. **カテゴリごとに検索を実行** — Grep ツールを使い、対象ファイルに対して検索パターンを実行
   - 検出結果から除外ルールに該当するものを除く
   - 該当件数が多いカテゴリは、サンプル（最大5ファイル）を表示し、ユーザーに修正範囲を確認
   - 該当件数が少ない（10件以下）カテゴリは自動修正

4. **修正の実行** — 1ファイルずつ Read → Edit → 次のファイル

5. **最終検証**
   ```bash
   pnpm lint
   pnpm typecheck
   ```

6. **結果報告**
   - カテゴリごとの検出件数・修正件数
   - 未修正の項目と理由（設計判断が必要な場合等）

### 単一カテゴリ実行時

指定されたカテゴリのみ手順 1, 3-5 を実行する。

---

## 重要な注意事項

- lint / ESLint ルールで検証可能な項目は、手動チェックではなく `pnpm lint` の結果を信頼する
- デザイン機能（`src/components/atoms/design/`, `src/components/section/project/design/`）を変更する場合、CLAUDE.md のテストケースルールに従う
- 修正の影響範囲が大きい場合（20ファイル超）、ユーザーに確認してから実行する
- 親コンポーネントの呼び出し箇所も忘れずに更新する
