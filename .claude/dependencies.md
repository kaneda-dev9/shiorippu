# 依存パッケージ・外部API

## npm パッケージ

### dependencies
| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| `nuxt` | ^4.4.2 | フレームワーク |
| `vue` | ^3.5.30 | UIフレームワーク |
| `vue-router` | ^5.0.3 | ルーティング |
| `@nuxt/ui` | ^4.5.1 | UIコンポーネントライブラリ |
| `tailwindcss` | ^4.2.1 | CSSフレームワーク |
| `pinia` | ^3.0.4 | 状態管理 |
| `@pinia/nuxt` | ^0.11.3 | Pinia Nuxt統合 |
| `@supabase/supabase-js` | ^2.99.1 | Supabase クライアント |
| `ai` | ^6.0.116 | Vercel AI SDK |
| `@ai-sdk/anthropic` | ^3.0.58 | Claude API接続 (AI SDK) |
| `@ai-sdk/vue` | ^3.0.116 | Vue統合 (useChat等) |
| `dayjs` | ^1.11.20 | 日付処理 (日本語ロケール) |
| `@vueuse/nuxt` | ^14.2.1 | VueUse Nuxt統合 |
| `@vueuse/core` | ^14.2.1 | VueUse コアユーティリティ |
| `vue-draggable-plus` | ^0.6.1 | ドラッグ&ドロップ |
| `zod` | ^4.3.6 | バリデーション (Standard Schema) |
| `@googlemaps/js-api-loader` | ^2.0.2 | Google Maps JS API |
| `@internationalized/date` | 3.12.0 | 国際化日付 (DatePicker) |
| `jspdf` | ^4.2.0 | PDF出力 |
| `marked` | ^17.0.4 | Markdown→HTML変換 |
| `dompurify` | ^3.3.3 | HTMLサニタイズ |

### devDependencies
| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| `@nuxt/devtools` | ^3.2.3 | 開発ツール |
| `@nuxt/eslint` | ^1.15.2 | ESLint統合 |
| `eslint` | ^10.0.3 | コード品質チェック |
| `typescript` | ^5.7.0 | 型チェック |
| `vitest` | ^4.1.0 | テストフレームワーク |
| `@nuxt/test-utils` | ^4.0.0 | Nuxtテストユーティリティ |
| `@vue/test-utils` | ^2.4.6 | Vueコンポーネントテスト |
| `happy-dom` | ^20.8.4 | テスト用DOM |
| `postgres` | ^3.4.8 | RLSテスト用DB接続 |
| `@vite-pwa/nuxt` | ^1.1.1 | PWA機能 |
| `@types/google.maps` | ^3.58.1 | Google Maps型定義 |

## 外部API

### Supabase
- Auth (Google OAuth / PKCE)
- PostgreSQL (データ保存 / RLS)
- Realtime (Presence / Broadcast / Postgres Changes)
- Storage (画像アップロード、将来)

### Claude API (via Vercel AI SDK)
- `streamText()` + Tool Use でストリーミング応答
- サーバーサイドのみで呼び出し（APIキーを保護）

### Google Maps Platform
- Places API (スポット検索)
- Maps JavaScript API (地図表示)
- Directions API (ルート計算)

### Google Calendar API
- OAuth refresh token でカレンダーイベント作成
- トークンは AES-256-GCM で暗号化保存

## 環境変数

```bash
# .env
# Public (クライアントに露出)
NUXT_PUBLIC_SUPABASE_URL=https://vtiaafkycamogbjukwqe.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=     # Supabase Dashboard → Settings → API
NUXT_PUBLIC_GOOGLE_MAPS_API_KEY=   # Google Cloud Console
NUXT_PUBLIC_APP_URL=http://localhost:3000

# Server-only (絶対にクライアントに出さない)
NUXT_SUPABASE_SERVICE_KEY=         # Supabase Dashboard → Settings → API (service_role)
NUXT_CLAUDE_API_KEY=               # Anthropic Console
NUXT_GOOGLE_CLIENT_ID=             # Google Cloud Console (OAuth)
NUXT_GOOGLE_CLIENT_SECRET=         # Google Cloud Console (OAuth)
NUXT_TOKEN_ENCRYPTION_KEY=         # 32バイトHex (AES-256-GCM用)
```
