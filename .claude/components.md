# コンポーネント設計

## Nuxt UI v4 コンポーネントマッピング

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
| チャット | `UChatMessages`, `UChatMessage`, `UChatPromptSubmit`, `UChatTool`, `UChatReasoning` |
| スライドオーバー | `USlideover` (AIサイドパネル) |
| モーダル | `UModal` |
| スケルトン | `USkeleton` |
| セパレーター | `USeparator` |
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
| コールバック | `/auth/callback` | — | OAuth PKCE処理 |
| ダッシュボード | `/dashboard` | 必須 | マイしおり一覧 |
| エディタ | `/shiori/[id]` | 必須 | しおり編集 (AIチャットパネル統合) |
| マップビュー | `/shiori/[id]/map` | 必須 | Google Maps + イベント表示 |
| 招待受付 | `/invite/[token]` | 必須 | 招待リンク経由参加 |
| 公開ビュー | `/s/[id]` | 不要 | 公開しおり閲覧 (PDF・カレンダー出力対応) |

## カスタムコンポーネント構成

```
app/components/
├── atoms/                         # 汎用UIパーツ (ドメイン知識なし)
│   ├── ConfirmModal.vue           # 確認ダイアログ
│   ├── CopyableInput.vue          # コピー可能な入力フィールド
│   ├── DatePicker.vue             # 日付選択 (Internationalized Date)
│   ├── EmptyState.vue             # 空状態表示
│   └── Tab.vue                    # タブ切り替え
├── containers/                    # ドメイン知識を持つ汎用コンポーネント
│   ├── map/
│   │   └── PlaceAutocomplete.vue  # 場所オートコンプリート
│   └── shiori/
│       ├── CoverImagePicker.vue   # カバー画像選択
│       └── TemplateSelector.vue   # テンプレート選択UI
└── section/                       # ページ固有コンポーネント
    ├── chat/
    │   ├── ChatPanel.vue          # AIチャットサイドパネル (SSEストリーミング)
    │   ├── ChoiceCards.vue         # 選択肢カード表示
    │   ├── MessageContent.vue     # Markdown→HTML変換表示
    │   ├── PlanPreview.vue        # AIプランプレビュー
    │   └── Welcome.vue            # 初期ウェルカムメッセージ
    ├── map/
    │   ├── MapView.vue            # Google Maps表示
    │   └── MapEventList.vue       # マップ連動イベント一覧
    └── shiori/
        ├── CalendarExportButton.vue  # Googleカレンダー出力
        ├── EventFormModal.vue     # イベント編集モーダル
        ├── PdfExportButton.vue    # PDF出力
        └── ShareModal.vue         # 共有設定モーダル
```

## デザインテンプレート (5種)

| ID | 名前 | 用途 | カラー |
|----|------|------|--------|
| `simple` | シンプル | ミニマル | stone系 |
| `pop` | ポップ | 家族旅行 | orange/pink/yellow |
| `wafuu` | 和風 | 京都・温泉 | brown/amber |
| `resort` | リゾート | 海・南国 | cyan/sky |
| `nature` | ナチュラル | キャンプ・自然 | green/lime |
