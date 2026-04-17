# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 言語

応答・コメント・コミットメッセージはすべて日本語。変数名・関数名・型名は英語。
コミット形式: `feat: 〜` / `fix: 〜` / `refactor: 〜` / `chore: 〜` / `docs: 〜` / `test: 〜` / `style: 〜`

## 行動原則

### コードを書く前に考える

- 仮定は明示的に述べること
- 不確かなら質問すること
- 複数の解釈がある場合は提示すること（黙って選ぶな）
- よりシンプルな方法があるなら提案すること
- 必要なら反論すること

### シンプルさを最優先する

- 問題を解決する最小限のコードだけ書くこと
- 推測でコードを書くな
- 頼まれていない機能は追加するな
- 一度しか使わないコードに抽象化レイヤーを作るな
- 200 行書いて 50 行で済むなら書き直すこと

### 必要な箇所だけ変更する

- 必要な部分だけを変更すること
- 関係のないデッドコードに気づいたら、削除せず報告だけすること
- 自分の変更で不要になったインポートや変数だけを削除すること
- チェック：変更した全行がユーザーのリクエストに直接紐づいているか？

### ゴール駆動で実行する

- 成功基準を定義してから実装を始めること
- 成功基準が満たされるまでループすること
- 「動くようにして」ではなく「○○ という状態になること・テストが全件パスすること」のように具体的な完了条件を設定すること

---

## セキュリティ（厳守）

以下は絶対に読み取り・出力・コード埋め込みしない:

| 変数                        | 用途                                 |
| --------------------------- | ------------------------------------ |
| `NUXT_SUPABASE_SERVICE_KEY` | Supabase service role (RLS バイパス) |
| `NUXT_CLAUDE_API_KEY`       | Claude API                           |
| `NUXT_TOKEN_ENCRYPTION_KEY` | AES-256-GCM キー                     |
| `NUXT_GOOGLE_CLIENT_SECRET` | Google OAuth シークレット            |
| `DATABASE_URL`              | 生 Postgres 接続                     |

`NUXT_PUBLIC_*` のみクライアント露出可。`.env` の読み書き禁止（`.env.example` は可）。`cat .env` / `printenv` / `env` での環境変数ダンプ、`curl ... | bash`、`git push --force`、`git reset --hard`、`rm -rf`、`sudo` はすべて禁止。違反が疑われたら即停止してユーザーへ日本語で報告。

## 非自明な落とし穴（知らないとバグる）

- **API 呼び出しは `useAuthFetch()` 経由でサーバー API を通す**。クライアントから `supabase.from()` で INSERT+SELECT すると RLS で 403 になるケースあり
- サーバーは `useServerSupabase()`（service role）を使用。RLS が効かないので **`owner_id` 等のフィルタを明示的にかける**
- `useSupabaseWithAuth()` は **非推奨**（Supabase JS が Authorization ヘッダーを上書きする）
- サーバー API 入口では `requireAuth(event)` で JWT 検証
- OAuth コールバックでは `exchangeCodeForSession(code)` を**明示的に呼ぶ**（PKCE）
- AI は **Vercel AI SDK (`ai` + `@ai-sdk/anthropic`)** を使う。`@anthropic-ai/sdk` は削除済みで使わない
- プラグインの初期化順序: `supabase.client.ts` → `auth.client.ts`（`dependsOn`）
- `routeRules` で `/dashboard` と `/shiori/**` は `ssr: false`（認証依存 / hydration 対策）
- Nitro `maxDuration: 60`（AI SSE 用、デフォルト 10 秒では不足）
- `ENFILE` エラー時は `ulimit -n 10240`

## プランモード実行時

作成したプランに対して必ず別でエイジェントを立てて、レビューさせること
無理に粗探しする必要はなく、汎用性と再開発、冗長性とメンテナンス性、ロジックのパフォーマンスを重点的にチェックして、改善点や懸念点、他考慮不足があればユーザに共有

## 参照ドキュメント

詳細は `.claude/` を信頼できる情報源として参照し、関連変更時は該当 md も更新する:

- `requirements.md` — 要件・画面・AI 設計 / `architecture.md` — 技術スタック・DB・認証・Realtime
- `code-style.md` / `components.md` / `dependencies.md` / `testing.md`
- `rules/` — `general` / `nuxt-ui` / `supabase` / `composables` / `vue-components`

## Supabase

Project ID: `vtiaafkycamogbjukwqe` / Region: ap-northeast-1 / Google OAuth 設定済み。スキーマ変更は Supabase Dashboard SQL Editor か MCP ツールで実行し、`architecture.md` と `requirements.md` に反映。
