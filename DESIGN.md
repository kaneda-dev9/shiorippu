# DESIGN.md — しおりっぷ (Shiorippu)

> このファイルはAIエージェントが正確な日本語UIを生成するためのデザイン仕様書です。
> セクションヘッダーは英語、値の説明は日本語で記述しています。
> 実サイトの CSS / Tailwind CSS v4 / Nuxt UI v4 の設定に基づく。

---

## 1. Visual Theme & Atmosphere

- **デザイン方針**: 温かみのある旅の記録帳。万年筆風ディスプレイフォント（Klee One）とオレンジ系アクセントで親しみやすさを演出しつつ、Noto Sans JP による本文の可読性を確保。無印良品的な「余白で語る」ミニマリズムを意識し、装飾を抑えてコンテンツを主役にする
- **密度**: ゆったりとしたコンシューマ向けUI。情報の詰め込みより余白と階層を重視。要素間に十分なゆとりを持たせ、静かで穏やかなリズム感を維持する
- **キーワード**: 温かい、親しみやすい、手書き感、旅のしおり、ナチュラル、素朴、余白
- **カテゴリ**: 旅行プランニング / コンシューマ
- **ダークモード**: light 優先（`colorMode.preference: 'light'`）。全コンポーネントで `dark:` バリアントを提供

---

## 2. Color Palette & Roles

Nuxt UI v4 のカラーシステムを使用。Tailwind CSS v4 のカラーユーティリティで指定する。

### Primary（ブランドカラー）

- **primary**: `orange` — Nuxt UI primary。CTAボタン、リンク、アクティブ状態に使用
- **ブランドアクセント**: `amber-700` (`#b45309`) — テーマカラー、ロゴ、ヘッダーアイコン
- **ハイライト**: `amber-50` / `amber-100` — 背景ハイライト、空状態のアクセント
- **ホバーリング**: `amber-300` — カードホバー時のリング

### Semantic（意味的な色）

- **error**: `error` — エラー、削除、危険な操作（`red` ではなく `error` を使う）
- **success**: `success` — 成功、完了
- **warning**: `warning` — 警告、注意喚起
- **info**: `info` — 情報、ヒント

### Neutral（ニュートラル）

- **neutral**: `stone` — Nuxt UI neutral
- **Text Primary**: `stone-900` (`#1c1917`) / dark: `stone-50` (`#fafaf9`)
- **Text Secondary**: `stone-500` (`#78716c`) / dark: `stone-400` (`#a8a29e`)
- **Text Disabled**: `stone-400` (`#a8a29e`) / dark: `stone-500` (`#78716c`)
- **Border**: `stone-200` (`#e7e5e4`) / dark: `stone-800` (`#292524`)
- **Background**: `stone-50` (`#fafaf9`) または `white` (`#ffffff`) / dark: `stone-950` (`#0c0a09`)
- **Surface**: `white` (`#ffffff`) / dark: `stone-900` (`#1c1917`) — カード、モーダル等

### 特殊用途

- **きなり色**: `--color-kinari` (`#f4eede`) / dark: `--color-kinari-dark` (`#2a2520`) — MUJI inspired の温かみのあるオフホワイト。ヒーローセクション等の背景に使用（ユーティリティ: `.bg-kinari`, `.dark:bg-kinari-dark`）
- **セクションラベル**: `teal-600` (`#0d9488`) — 機能紹介等のカテゴリラベル

---

## 3. Typography Rules

### 3.1 和文フォント

- **ゴシック体（本文）**: Noto Sans JP（ウェイト: 300, 400, 500, 600, 700）
- **万年筆風（見出し・ロゴ）**: Klee One（ウェイト: 400, 600）— 旅のしおりらしい手書き感

### 3.2 欧文フォント

- 和文フォント内蔵の欧文グリフを使用（欧文専用フォントは未指定）
- **等幅**: システムデフォルト（コード表示が少ないため）

### 3.3 font-family 指定

```css
/* 本文（CSS変数: --font-family-base） */
font-family: 'Noto Sans JP', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif;

/* 見出し・ロゴ（CSS変数: --font-family-display、ユーティリティ: .font-display） */
font-family: 'Klee One', 'Noto Sans JP', serif;
```

**フォント読み込み**: Google Fonts CDN から `@import url()` で読み込み（`display=swap`）

### 3.4 文字サイズ・ウェイト階層

Tailwind CSS のユーティリティクラスで管理。

| Role | Tailwind Class | Size | Weight | 用途 |
|------|---------------|------|--------|------|
| Display | `text-3xl sm:text-4xl font-display` | 30px / 36px | 600 (semibold) | ページタイトル、ヒーロー見出し |
| Heading 1 | `text-2xl sm:text-3xl` | 24px / 30px | 700 (bold) | セクション見出し |
| Heading 2 | `text-xl sm:text-2xl` | 20px / 24px | 600 (semibold) | サブ見出し |
| Heading 3 | `text-lg` | 18px | 500 (medium) | 小見出し |
| Body | `text-sm sm:text-base` | 14px / 16px | 400 (normal) | 本文 |
| Caption | `text-xs sm:text-sm` | 12px / 14px | 400 (normal) | 補足、タイムスタンプ |
| Small | `text-xs` | 12px | 400 (normal) | バッジ、最小テキスト |

### 3.5 行間・字間

- **本文の行間 (line-height)**: `leading-relaxed` = 1.625 を推奨デフォルトとする（MUJIの統一 line-height 1.6 に倣い、ゆったりとした読書体験を提供）。最低でも `leading-normal` = 1.5 を厳守
- **見出しの行間**: `leading-tight` (1.25) ～ `leading-snug` (1.375)
- **字間 (letter-spacing)**: 特別な指定なし（Noto Sans JP のデフォルトメトリクスを使用）
- **見出し**: `text-wrap: balance` で均等な折り返し（h1, h2, h3 にグローバル適用済み）

**ガイドライン**:
- 日本語本文は `line-height: 1.5` 以上を厳守（1.4以下は可読性が著しく低下する）
- Klee One（.font-display）の見出しは `leading-snug` (1.375) が視覚的にバランスが良い
- 本文に `letter-spacing` を追加する場合は `0.04em` 程度（現状はデフォルトで十分）

### 3.6 禁則処理・改行ルール

```css
/* グローバル設定 */
overflow-wrap: break-word;       /* 長いURLや英単語の折り返し */

/* フォントレンダリング（Nuxt UI / Tailwind デフォルト） */
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

- ブラウザデフォルトの禁則処理に依存
- 必要に応じて `word-break: break-all` を追加

### 3.7 OpenType 機能

```css
/* 時刻・数値の等幅数字（.tabular-nums, time, [data-time] に自動適用） */
font-variant-numeric: tabular-nums;
```

- **tabular-nums**: 時刻・数値の桁揃え。スケジュール表示で重要
- **palt / kern**: 未使用（Noto Sans JP のデフォルトメトリクスで十分。見出しへの palt 適用は将来検討可）

### 3.8 縦書き

該当なし

---

## 4. Component Stylings

Nuxt UI v4 コンポーネントを使用。カスタムスタイルは最小限に抑える。

### Buttons（UButton）

| Variant | 用途 | 備考 |
|---------|------|------|
| `default` | プライマリCTA | color="primary" |
| `soft` | セカンダリアクション | |
| `outline` | 第三のアクション | |
| `ghost` | ナビゲーション、ツールバー | |
| `link` | インラインリンク風ボタン | NuxtLink代替 |

- CTA ボタンサイズ: `size="xl"` + アイコン付き
- アイコンは Lucide: `i-lucide-*` 形式

### Cards（UCard）

- バリアント: `outline`
- パディング: `p-3 sm:p-4`
- ホバー: `hover:shadow-md hover:ring-1 hover:ring-amber-300`
- 角丸: `rounded-lg`

### Inputs（UInput, UTextarea）

- Nuxt UI デフォルトスタイルを使用
- フォーカス時: primary カラーのリング

### Modals & Overlays

- **モーダル**: `UModal`
- **サイドパネル**: `USlideover`（モバイルメニュー等、右から展開）
- **通知**: `useToast()`

### Badges（UBadge）

- バリアント: `subtle`
- カラー: `success`, `info`, `error` 等セマンティックカラー

### Icons

- **ライブラリ**: Lucide（`i-lucide-*` 形式）
- **サイズ**: `size-3`（12px）～ `size-10`（40px）

---

## 5. Layout Principles

### Spacing Scale

Tailwind CSS のデフォルトスペーシングスケール（4px 基準）を使用。

| Token | Value | よく使う場面 |
|-------|-------|------------|
| 1 | 4px | アイコンとテキストの間 |
| 2 | 8px | 要素間の最小間隔 |
| 3 | 12px | カード内パディング（モバイル） |
| 4 | 16px | カード内パディング、セクション内間隔 |
| 6 | 24px | コンテナ水平パディング（sm） |
| 8 | 32px | コンテナ水平パディング（lg）、セクション間 |
| 16 | 64px | セクション垂直間隔（py-16） |
| 24 | 96px | ヒーローセクション垂直間隔（sm:py-24） |

### Container

- **最大幅**: `max-w-7xl`（1280px）— ヘッダー
- **コンテンツ**: `max-w-5xl`（1024px）— ダッシュボード、リスト
- **テキスト中心**: `max-w-3xl`（768px）— ヒーロー、記事
- **水平パディング**: `px-4 sm:px-6 lg:px-8`

### Grid

- **カードグリッド**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- **ガター**: `gap-4`（16px）～ `gap-x-8 gap-y-10`

### Header

- 高さ: `h-14`（56px）
- 固定: `sticky top-0 z-50`
- 背景: 透明 + `backdrop-blur`

---

## 6. Depth & Elevation

| Level | Tailwind Class | 用途 |
|-------|---------------|------|
| 0 | `shadow-none` | フラットな要素（基本はフラット。MUJIに倣い影は控えめに） |
| 1 | `shadow-sm` | カード通常状態（控えめな浮き） |
| 2 | `shadow-md` | カードホバー、ドロップダウン |
| 3 | `shadow-lg` | モーダル、フローティング要素（使用は最小限に） |

- 基本方針: **フラットを基調**とし、影は状態変化（ホバー等）のフィードバックとして使う
- ホバー時に `shadow-none` or `shadow-sm` → `shadow-md` のトランジション
- カードホバーで `ring-1 ring-amber-300` を併用

---

## 7. Do's and Don'ts

### Do（推奨）

- Nuxt UI v4 コンポーネントを優先使用する
- セマンティックカラー名（`error`, `success`）を使う（`red`, `green` ではなく）
- `.font-display`（Klee One）をブランド要素・見出しに使う
- モバイルファーストでレスポンシブ設計する
- `stone` 系カラーで統一感を出す
- 空状態には `AtomsEmptyState` を使う
- アイコンは Lucide（`i-lucide-*`）で統一する
- **余白を十分に取る** — 要素間にゆとりを持たせ、詰め込みすぎない（MUJIの余白哲学）
- **本文の行間は `leading-relaxed`(1.625) を標準とする** — ゆったりとした読書体験を提供
- **装飾は最小限に** — 不要なグラデーション、過剰なシャドウ、派手なアニメーションを避ける

### Don't（禁止）

- `red` 等の直接カラー名を使わない → `error` を使う
- テキスト色に純粋な `#000000` を使わない（コントラストが強すぎる → `stone-900` (#1c1917) を使う）
- 背景に純白 `#ffffff` のみで完結させない（`stone-50` と組み合わせて温かみを出す）
- ヘッダー高さを `h-14` 以外にしない
- 本文に Klee One を使わない（手書き風フォントは長文の可読性が下がる → 見出し・ロゴ専用）
- `router.push()` を使わない → `navigateTo()` を使う
- `font-family` を直接指定しない → CSS変数 `--font-family-base` / `--font-family-display` を使う
- 日本語本文の `line-height` を 1.4 以下にしない（日本語は欧文より広い行間が必要）
- ゴシック体（Noto Sans JP）と Klee One を同じ文章内で混ぜない
- **装飾的なグラデーション、過剰なシャドウ、派手なアニメーションを多用しない** — コンテンツが主役
- **要素を詰め込みすぎない** — 余白が足りないと感じたら、情報量を減らすことを検討する

---

## 8. Responsive Behavior

### Breakpoints

Tailwind CSS のデフォルトブレークポイントを使用。

| Name | Width | 説明 |
|------|-------|------|
| Mobile | < 640px | 1カラム、ハンバーガーメニュー |
| sm (Tablet) | ≥ 640px | 2カラムグリッド、拡張パディング |
| md | ≥ 768px | |
| lg (Desktop) | ≥ 1024px | 3カラムグリッド、最大パディング |

### タッチターゲット

```css
/* タッチデバイスでダブルタップズーム遅延を防止 */
button, a, [role="button"] {
  touch-action: manipulation;
}
```

### レスポンシブパターン

- **テキスト**: `text-sm sm:text-base`（モバイルでやや小さく）
- **パディング**: `px-4 sm:px-6 lg:px-8`
- **グリッド**: `grid-cols-1 → sm:grid-cols-2 → lg:grid-cols-3`
- **ナビゲーション**: モバイルは `USlideover`、デスクトップは横並び

---

## 9. Agent Prompt Guide

### クイックリファレンス

```
Primary Color: orange (Nuxt UI) / amber-700 (#b45309) (brand accent)
Neutral: stone
Text Color: stone-900 (light) / stone-50 (dark)
Background: stone-50 or white (light) / stone-950 (dark)
Body Font: 'Noto Sans JP', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif
Display Font: 'Klee One', 'Noto Sans JP', serif (.font-display)
Body Size: text-sm sm:text-base (14px / 16px)
Icon: Lucide (i-lucide-*)
UI Library: Nuxt UI v4
CSS Framework: Tailwind CSS v4
```

### 新しいページを作成する際の指針

1. **レイアウト**: `max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8` をベースコンテナとする
2. **見出し**: ページタイトルは `text-2xl font-bold` + 必要に応じて `.font-display`
3. **カードリスト**: `UCard variant="outline"` + グリッド `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`
4. **ボタン**: `UButton` を使い、CTA は `size="xl" color="primary"`
5. **空状態**: `AtomsEmptyState` コンポーネントで統一
6. **通知**: `useToast()` でユーザーフィードバック
7. **ダークモード**: 全要素に `dark:` バリアントを付与

### プロンプト例

```
しおりっぷのデザインに従って、旅行先の一覧ページを作成してください。
- Nuxt UI v4 の UCard（variant="outline"）でカード型
- グリッド: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4
- カードホバー: hover:shadow-md hover:ring-1 hover:ring-amber-300
- 空状態: AtomsEmptyState コンポーネント
- フォント: 見出しに .font-display、本文は Noto Sans JP
- カラー: primary=orange, neutral=stone
```
