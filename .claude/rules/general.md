# 一般ルール

## 言語
- コード内のコメントは日本語
- コミットメッセージは日本語
- 型名・変数名は英語

## セキュリティ
- APIキーやシークレットを絶対にクライアントサイドに露出させない
- `NUXT_SUPABASE_SERVICE_KEY` と `NUXT_CLAUDE_API_KEY` はサーバーサイドのみ
- Supabase RLS を常に意識し、クライアントからの直接クエリでもデータが漏れないようにする
- ユーザー入力は必ずバリデーション

## パフォーマンス
- Supabase RLSで `(select auth.uid())` を使う（initplan最適化）
- 不要なリアクティブ監視を避ける
- 画像はSupabase Storageに保存し、CDN経由で配信

## エラーハンドリング
- Supabaseクエリは `{ data, error }` を必ずチェック
- ユーザー向けエラーは `useToast()` でフレンドリーに表示
- console.error でデバッグ情報を記録
