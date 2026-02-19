# Supabase ルール

## クライアントサイド
- `useSupabase()` composable 経由でクライアントを取得
- 認証は `useAuth()` composable を使う
- RLSが有効なので、クライアントから直接 `supabase.from()` でクエリしてOK

## サーバーサイド
- `useServerSupabase()` で service role クライアントを使用
- RLSをバイパスする必要がある場合のみ service role を使う
- Claude API呼び出しなど、クライアントに露出できない処理用

## マイグレーション
- テーブル変更は Supabase Dashboard の SQL Editor か MCP ツールで実行
- 変更内容は要件定義v3に反映する

## Realtime
- しおり編集画面で Postgres Changes を subscribe
- Presence で「誰がオンラインか」を表示
- Broadcast でカーソル位置を共有
