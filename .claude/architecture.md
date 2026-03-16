# アーキテクチャ

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Nuxt v4.4 / Vue 3.5 / TypeScript |
| UI | Nuxt UI v4.5 / Tailwind CSS v4 |
| 状態管理 | Pinia v3 (クライアントキャッシュのみ、永続化なし) |
| バックエンド | Supabase (PostgreSQL / Auth / Realtime / Storage) |
| AI | Claude API (Vercel AI SDK / Tool Use / SSE Streaming) |
| 地図 | Google Maps Platform (Places / Maps JS / Directions) |
| デプロイ | Vercel (GitHub連携自動デプロイ) |
| CI | GitHub Actions (lint / typecheck / test) |

## ディレクトリ構成

```
shiorippu/
├── app/
│   ├── app.vue                    # ルートコンポーネント (<UApp>ラッパー)
│   ├── app.config.ts              # Nuxt UI テーマ (orange/stone)
│   ├── assets/css/main.css        # Tailwind CSS v4 + Nuxt UI
│   ├── composables/
│   │   ├── auth.ts                # useAuth — 認証状態管理
│   │   ├── authFetch.ts           # useAuthFetch — 認証付きAPI呼び出し
│   │   ├── supabase.ts            # useSupabase — Supabaseクライアント
│   │   ├── chatStream.ts          # useChatStream — AI SDK useChat統合
│   │   ├── shioriEditor.ts        # useShioriEditor — エディタ状態管理
│   │   ├── realtimeSync.ts        # useRealtimeSync — Supabase Realtime
│   │   ├── googleMaps.ts          # useGoogleMaps — Maps JS API
│   │   ├── pdfExport.ts           # usePdfExport — PDF出力 (jspdf)
│   │   └── calendarExport.ts      # useCalendarExport — Googleカレンダー連携
│   ├── components/
│   │   ├── atoms/                 # 汎用UIパーツ (ドメイン知識なし)
│   │   │   ├── ConfirmModal.vue
│   │   │   ├── CopyableInput.vue
│   │   │   ├── DatePicker.vue
│   │   │   ├── EmptyState.vue
│   │   │   └── Tab.vue
│   │   ├── containers/            # ドメイン知識を持つ汎用コンポーネント
│   │   │   ├── map/PlaceAutocomplete.vue
│   │   │   └── shiori/
│   │   │       ├── CoverImagePicker.vue
│   │   │       └── TemplateSelector.vue
│   │   └── section/               # ページ固有コンポーネント
│   │       ├── chat/
│   │       │   ├── ChatPanel.vue        # AIチャットサイドパネル
│   │       │   ├── ChoiceCards.vue       # 選択肢カード表示
│   │       │   ├── MessageContent.vue   # Markdown→HTML変換表示
│   │       │   ├── PlanPreview.vue      # AIプランプレビュー
│   │       │   ├── ToolIndicator.vue    # ツール実行状態表示
│   │       │   └── Welcome.vue          # 初期ウェルカム
│   │       ├── map/
│   │       │   ├── MapView.vue          # Google Maps表示
│   │       │   └── MapEventList.vue     # マップ連動イベント一覧
│   │       └── shiori/
│   │           ├── CalendarExportButton.vue
│   │           ├── EventFormModal.vue
│   │           ├── PdfExportButton.vue
│   │           └── ShareModal.vue
│   ├── layouts/default.vue        # レスポンシブヘッダー・モバイルメニュー・フッター
│   ├── pages/
│   │   ├── index.vue              # トップ (ヒーロー、特徴、3ステップ)
│   │   ├── login.vue              # ログイン (Google OAuth)
│   │   ├── dashboard.vue          # マイしおり一覧
│   │   ├── auth/callback.vue      # OAuth PKCE コールバック
│   │   ├── shiori/[id]/index.vue  # エディタ (AIチャットパネル統合)
│   │   ├── shiori/[id]/map.vue    # マップビュー
│   │   ├── invite/[token].vue     # 招待受付
│   │   └── s/[id].vue             # 公開しおり閲覧
│   ├── plugins/                   # supabase.client, auth.client (dependsOnで順序制御)
│   ├── stores/shiori.ts           # Pinia しおりCRUD
│   └── utils/date.ts              # dayjs 日付フォーマットユーティリティ
├── server/
│   ├── api/
│   │   ├── shiori/                # しおりCRUD (5エンドポイント)
│   │   │   ├── index.get.ts       # 一覧取得
│   │   │   ├── index.post.ts      # 新規作成
│   │   │   ├── [id].get.ts        # 詳細取得
│   │   │   ├── [id].put.ts        # 更新
│   │   │   ├── [id].delete.ts     # 削除
│   │   │   └── [id]/
│   │   │       ├── apply-plan.post.ts              # AIプラン適用
│   │   │       ├── collaborators.get.ts            # コラボレーター一覧
│   │   │       ├── collaborators/[collaboratorId].delete.ts
│   │   │       ├── export-calendar.post.ts         # Googleカレンダーエクスポート
│   │   │       └── invite.put.ts                   # 招待設定
│   │   ├── chat/
│   │   │   ├── index.post.ts              # AIチャット (Vercel AI SDK, Tool Use, SSE)
│   │   │   └── [shioriId]/messages.get.ts # チャット履歴取得
│   │   ├── day/                   # 日程CRUD (4エンドポイント)
│   │   │   ├── index.post.ts
│   │   │   ├── [id].put.ts
│   │   │   ├── [id].delete.ts
│   │   │   └── reorder.post.ts
│   │   ├── event/                 # イベントCRUD (4エンドポイント)
│   │   │   ├── index.post.ts
│   │   │   ├── [id].put.ts
│   │   │   ├── [id].delete.ts
│   │   │   └── reorder.post.ts
│   │   ├── auth/
│   │   │   └── save-google-token.post.ts  # Googleトークン暗号化保存
│   │   └── invite/
│   │       └── [token].post.ts            # 招待トークン処理
│   └── utils/
│       ├── auth.ts                # requireAuth — JWT検証
│       ├── supabase.ts            # useServerSupabase (service role)
│       ├── google-maps.ts         # searchPlaces, getPlaceDetails, getDirections
│       ├── google-calendar.ts     # Google Calendar API連携
│       ├── token-encryption.ts    # AES-256-GCM 暗号化/復号化
│       └── cover-image.ts         # カバー画像ユーティリティ
├── shared/                        # テンプレート定義等 (Tailwind CSS スキャン対象)
├── types/database.ts              # 全DB型定義
├── vercel.json                    # Vercel設定
└── nuxt.config.ts
```

## データベース設計

### テーブル一覧

| テーブル | 説明 | 主なカラム |
|---------|------|-----------|
| `profiles` | ユーザープロフィール | display_name, avatar_url |
| `shioris` | しおり本体 | title, area, template_id, is_public, invite_token, invite_enabled |
| `days` | 日程 | shiori_id, day_number, date, sort_order |
| `events` | 予定 | day_id, title, category, start_time, place_id, lat/lng, booking_status |
| `chat_messages` | AI会話履歴 | shiori_id, role, content, metadata (選択肢JSON) |
| `collaborators` | 共同編集者 | shiori_id, user_id, role (owner/editor) |

### RLSポリシー方針
- ヘルパー関数: `is_shiori_member(p_shiori_id)`, `is_shiori_public(p_shiori_id)`
- `(select auth.uid())` でinitplan最適化
- 全関数に `SET search_path = ''`
- profiles: 全員閲覧可、自分のみ編集可
- shioris: メンバーまたは公開なら閲覧可、オーナーのみ更新/削除
- days/events: メンバーなら全操作可、公開なら閲覧のみ
- collaborators: メンバーなら閲覧可、オーナーまたは招待有効時にINSERT可

### トリガー
- `handle_new_user()` — auth.users INSERT時にprofiles自動作成
- `update_updated_at()` — profiles, shioris, events のUPDATE時に自動更新

### Realtime
supabase_realtime publication: shioris, days, events, collaborators

## 認証

- Google OAuth のみ (PKCE flow)
- フロー: login.vue → Google → /auth/callback → dashboard
- Google refresh token は AES-256-GCM で暗号化してサーバーに保存（カレンダー連携用）

## 共同編集

- **編集権限**: 招待リンク方式 (invite_token: UUID v4)
  1. オーナーがinvite_enabled=trueに設定
  2. 招待リンクURLを共有
  3. 受け取った人がアクセス → 未ログインならGoogleログイン
  4. collaboratorsテーブルにINSERT (role='editor')
- **閲覧**: is_public=trueのしおりは認証不要で閲覧可
- **リアルタイム**: Supabase Realtime (Presence + Broadcast + Postgres Changes)

## AI相談フロー

エディタ内のサイドパネル（ChatPanel）でAIチャットを実行。

### Tool Use ツール一覧
| ツール | 説明 |
|--------|------|
| `search_places` | Google Places API でスポット検索 |
| `get_place_details` | スポット詳細情報取得 |
| `get_directions` | 2地点間の移動ルート・所要時間を計算 |
| `web_search` | Anthropic Web Search で最新情報を取得 |

### 技術実装
- Vercel AI SDK (`streamText`) による SSE ストリーミング
- `@ai-sdk/anthropic` で Claude API 接続
- `result.toUIMessageStreamResponse()` で標準的なSSE形式に変換
- `onFinish` コールバックでストリーミング完了後にDBに履歴保存
- 生成プランはワンクリックでDB INSERT（apply-plan API）

## デプロイ

- **Vercel**: GitHub連携で main push 時に自動デプロイ
- **Nitro設定**: `maxDuration: 60` (AIチャットSSEストリーミング用)
- **CI**: GitHub Actions で lint / typecheck / test を並列実行
