# Supabase ルール

## クライアントサイド
- `useSupabase()` composable 経由でクライアントを取得
- 認証は `useAuth()` composable を使う
- API呼び出しは `useAuthFetch()` composable でサーバーAPI経由（推奨）
- **注意**: クライアントからの直接 `supabase.from()` は RLS の制約で INSERT+SELECT が 403 になるケースあり。サーバーAPI経由を推奨

## サーバーサイド
- `useServerSupabase()` で service role クライアントを使用（RLSバイパス）
- `requireAuth(event)` で JWT 検証 → ユーザー情報取得
- service role 使用時は `owner_id` などのフィルタを明示的にかけること（RLSが効かないため）
- `useSupabaseWithAuth(event)` は Supabase JS が Authorization ヘッダーを上書きするため非推奨
- Claude API呼び出しなど、クライアントに露出できない処理用

## マイグレーション
- テーブル変更は Supabase Dashboard の SQL Editor か MCP ツールで実行
- 変更内容は要件定義v3に反映する

## Realtime
- しおり編集画面で Postgres Changes を subscribe
- Presence で「誰がオンラインか」を表示
- Broadcast でカーソル位置を共有
