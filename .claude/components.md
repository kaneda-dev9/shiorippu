# コンポーネント設計

## Nuxt UI v3 コンポーネントマッピング

プロジェクトで使用する主要なNuxt UIコンポーネント:

| 用途 | Nuxt UI コンポーネント |
|------|----------------------|
| ボタン | `UButton` |
| カード | `UCard` |
| アラート | `UAlert` |
| アバター | `UAvatar` |
| バッジ | `UBadge` |
| ドロップダウン | `UDropdownMenu` |
| アイコン | `UIcon` (Lucide: `i-lucide-*`) |
| AI チャット | `UChatMessage`, `UChatPrompt` (予定) |
| ステッパー | `UStepper` |
| タイムライン | `UTimeline` (しおり表示) |
| スライドオーバー | `USlideover` (AIサイドパネル) |
| モーダル | `UModal` |
| トースト | `useToast()` |

## テーマ設定

```typescript
// app.config.ts
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'orange',   // メインカラー
      neutral: 'stone',    // ベースカラー
    },
  },
})
```

## 画面一覧

| 画面 | パス | 認証 | 説明 |
|------|------|------|------|
| トップ | `/` | 不要 | ヒーロー、機能紹介 |
| ログイン | `/login` | guest | Google OAuthログイン |
| コールバック | `/auth/callback` | — | OAuth処理 |
| ダッシュボード | `/dashboard` | 必須 | マイしおり一覧 |
| エディタ | `/shiori/[id]` | 必須 | しおり編集 |
| プレビュー | `/shiori/[id]/preview` | 条件付き | しおりプレビュー |
| 共有設定 | `/shiori/[id]/share` | 必須 | 招待リンク管理 |
| AIチャット | `/shiori/[id]/plan` | 必須 | AI旅行相談 |
| 招待受付 | `/shiori/[id]/invite/[token]` | 必須 | 招待リンク経由参加 |
| 公開ビュー | `/s/[id]` | 不要 | 公開しおり閲覧 |

## カスタムコンポーネント構成 (予定)

```
app/components/
├── common/
│   └── AppLogo.vue
├── shiori/
│   ├── ShioriCard.vue          # ダッシュボードのカード
│   ├── DayTab.vue              # 日程タブ
│   ├── EventCard.vue           # 予定カード（ドラッグ対応）
│   ├── EventForm.vue           # 予定編集フォーム
│   └── TemplateSelector.vue    # テンプレート選択
├── chat/
│   ├── ChatChoiceCard.vue      # 選択肢カード
│   ├── ChatStepIndicator.vue   # ステップ進捗
│   └── PlanPreview.vue         # プラン提案表示
└── auth/
    └── GoogleLoginButton.vue   # Googleログインボタン
```

## デザインテンプレート (5種)

| ID | 名前 | 用途 | カラー |
|----|------|------|--------|
| `simple` | シンプル | ミニマル | stone系 |
| `pop` | ポップ | 家族旅行 | orange/pink/yellow |
| `wafuu` | 和風 | 京都・温泉 | brown/amber |
| `resort` | リゾート | 海・南国 | cyan/sky |
| `nature` | ナチュラル | キャンプ・自然 | green/lime |
