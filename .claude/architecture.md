# アーキテクチャ

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Nuxt v4.3.1, Vue 3.5, Nuxt UI v4.4 |
| 状態管理 | Pinia v3 (クライアントキャッシュのみ、永続化なし) |
| バックエンド | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| AI | Claude API (Function Calling / Tool Use) |
| 地図 | Google Maps Platform (Places, Maps JS, Directions) |
| デプロイ | Cloudflare Pages (予定) |

## ディレクトリ構成

```
shiorippu/
├── app/
│   ├── app.vue                    # ルートコンポーネント (<UApp>ラッパー)
│   ├── app.config.ts              # Nuxt UI テーマ (orange/stone)
│   ├── assets/css/main.css        # Tailwind + Nuxt UI (@import)
│   ├── composables/               # useAuth, useSupabase, useAuthFetch
│   ├── layouts/default.vue        # レスポンシブヘッダー・モバイルメニュー・フッター
│   ├── middleware/                 # auth (認証必須), guest (未認証のみ)
│   ├── pages/                     # ルーティング
│   │   ├── index.vue              # トップ (ヒーロー、特徴、3ステップ)
│   │   ├── login.vue              # ログイン (Google OAuth)
│   │   ├── dashboard.vue          # マイしおり一覧 (サーバーAPI経由)
│   │   ├── auth/callback.vue      # OAuth PKCE コールバック
│   │   └── shiori/[id]/           # エディタ (Sprint 2)
│   ├── plugins/                   # supabase.client, auth.client (dependsOnで順序制御)
│   ├── utils/date.ts              # dayjs 日付フォーマットユーティリティ
│   └── stores/shiori.ts           # Pinia しおりCRUD
├── server/
│   ├── api/
│   │   ├── shiori/                # しおりCRUD API (5エンドポイント)
│   │   │   ├── index.get.ts       # 一覧取得
│   │   │   ├── index.post.ts      # 新規作成
│   │   │   ├── [id].get.ts        # 詳細取得
│   │   │   ├── [id].put.ts        # 更新
│   │   │   └── [id].delete.ts     # 削除
│   │   └── chat/
│   │       └── index.post.ts      # AIチャット (Claude API, Tool Use, Web Search, SSEストリーミング)
│   └── utils/
│       ├── auth.ts                # requireAuth, useSupabaseWithAuth
│       ├── google-maps.ts         # searchPlaces, getPlaceDetails, getDirections
│       └── supabase.ts            # useServerSupabase (service role)
├── types/database.ts              # 全DB型定義
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

- **MVP**: Google OAuth のみ (PKCE flow)
- **将来**: LINE OAuth 追加予定
- フロー: login.vue → Google → /auth/callback → dashboard

## 共同編集

- **編集権限**: 招待リンク方式 (invite_token: UUID v4)
  1. オーナーがinvite_enabled=trueに設定
  2. `/shiori/{id}/invite/{invite_token}` のURLを共有
  3. 受け取った人がアクセス → 未ログインならGoogleログイン
  4. collaboratorsテーブルにINSERT (role='editor')
- **閲覧**: is_public=trueのしおりは認証不要で閲覧可
- **リアルタイム**: Supabase Realtime (Presence + Broadcast + Postgres Changes)

## AI相談フロー

ステップ型 + 選択肢カードUI (7ステップ):
1. 行き先 (5択 + その他)
2. 日程
3. 人数
4. テーマ (複数選択可)
5. 予算
6. 出発地
7. 特別リクエスト

### Function Calling ツール
- `present_choices` — 選択肢カードをUIに提示 (3〜5個 + その他)
- `search_spots` — Google Places API でスポット検索
- `get_spot_details` — スポット詳細情報取得
- `create_trip_plan` — 旅行プランを構造化JSONで生成
- `calculate_route` — 2地点間の移動ルート・所要時間を計算
