# 依存パッケージ・外部API

## npm パッケージ

### dependencies
| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| `nuxt` | ^4.3.0 | フレームワーク |
| `vue` | ^3.5.0 | UIフレームワーク |
| `vue-router` | ^4.5.0 | ルーティング |
| `@nuxt/ui` | ^4.4.0 | UIコンポーネントライブラリ |
| `tailwindcss` | ^4.0.0 | CSSフレームワーク (pnpmでは直接依存必須) |
| `pinia` | ^3.0.4 | 状態管理 |
| `@pinia/nuxt` | latest | Pinia Nuxt統合 |
| `@supabase/supabase-js` | ^2.49.0 | Supabase クライアント |
| `@anthropic-ai/sdk` | ^0.39.0 | Claude API (server-side) |
| `dayjs` | ^1.11.0 | 日付処理 (日本語ロケール) |
| `@vueuse/nuxt` | latest | VueUse Nuxt統合 |
| `@vueuse/core` | latest | VueUse コアユーティリティ |
| `zod` | ^4.3.0 | フォームバリデーション (Standard Schema) |

### devDependencies
| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| `@nuxt/devtools` | ^2.4.0 | 開発ツール |
| `typescript` | ^5.7.0 | 型チェック |

### 今後追加予定
| パッケージ | 用途 |
|-----------|------|
| `vuedraggable` / `@vueuse/integrations` | ドラッグ&ドロップ |
| `@googlemaps/js-api-loader` | Google Maps |

## 外部API

### Supabase
- Auth (Google OAuth)
- PostgreSQL (データ保存)
- Realtime (Presence, Broadcast, Postgres Changes)
- Storage (画像アップロード、将来)

### Claude API
- Messages API with Function Calling
- サーバーサイドのみで呼び出し（APIキーを保護）

### Google Maps Platform
- Places API (スポット検索)
- Maps JavaScript API (地図表示)
- Directions API (ルート計算)

## 環境変数

```bash
# .env
NUXT_PUBLIC_SUPABASE_URL=https://vtiaafkycamogbjukwqe.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=         # Supabase Dashboard → Settings → API
NUXT_SUPABASE_SERVICE_KEY=             # Supabase Dashboard → Settings → API (service_role)
NUXT_CLAUDE_API_KEY=                   # Anthropic Console
NUXT_PUBLIC_GOOGLE_MAPS_API_KEY=       # Google Cloud Console
NUXT_PUBLIC_APP_URL=http://localhost:3000
```

- `NUXT_PUBLIC_*` はクライアントに露出する（公開情報のみ）
- `NUXT_SUPABASE_SERVICE_KEY` はサーバーサイドのみ（絶対にクライアントに出さない）
- `NUXT_CLAUDE_API_KEY` はサーバーサイドのみ
