# しおりっぷ (Shiorippu)

AIと一緒に旅のプランを作成し、おしゃれな「旅のしおり」を作れるWebサービス。
国内旅行（日本）に特化。個人開発・趣味プロジェクト。

## 言語

すべての応答・コメント・コミットメッセージも日本語で記述すること。
コード中の変数名・関数名は英語のまま。

## ドキュメント

詳細は `.claude/` 配下を参照:

- [requirements.md](.claude/requirements.md) — 要件定義サマリー（機能一覧、画面構成、AI設計、非機能要件）
- [architecture.md](.claude/architecture.md) — 技術スタック、DB設計、認証、Realtime、AI相談フロー
- [code-style.md](.claude/code-style.md) — コーディング規約、命名規則
- [components.md](.claude/components.md) — Nuxt UI コンポーネント方針、画面構成
- [dependencies.md](.claude/dependencies.md) — パッケージ、外部API、環境変数
- [testing.md](.claude/testing.md) — テスト方針、動作確認手順
- [agent-teams.md](.claude/agent-teams.md) — Agent Teams 4人体制、Sprint計画
- [rules/](.claude/rules/) — AI向けルール（セキュリティ、Supabase、Nuxt UI）

> **重要**: 上記ドキュメントはプロジェクトの「信頼できる情報源」として機能する。
> Sprint完了時やアーキテクチャ変更時には、対応するmdファイルも必ず更新すること。
> 特に以下のタイミングで更新が必要:
>
> - 新しいパッケージ追加・バージョン変更 → `dependencies.md`
> - ファイル構成変更・新パターン導入 → `architecture.md`
> - 新コンポーネント追加・UI方針変更 → `components.md`
> - Sprint完了・タスクステータス変更 → `agent-teams.md`, `CLAUDE.md`
> - Supabase スキーマ変更 → `architecture.md`, `requirements.md`
> - 開発ルール・パターンの変更 → `rules/` 配下

## セキュリティポリシー（AIエージェント向け）

### 機密変数 — 絶対に読み取り・出力・コードへの埋め込みを禁止

| 変数名 | 用途 | 保管場所 |
|--------|------|----------|
| `NUXT_SUPABASE_SERVICE_KEY` | Supabase service role (RLSバイパス) | サーバーサイドのみ |
| `NUXT_CLAUDE_API_KEY` | Claude API キー | サーバーサイドのみ |
| `NUXT_TOKEN_ENCRYPTION_KEY` | AES-256-GCM 暗号化キー | サーバーサイドのみ |
| `NUXT_GOOGLE_CLIENT_SECRET` | Google OAuth クライアントシークレット | サーバーサイドのみ |
| `DATABASE_URL` | 生 Postgres 接続 (RLSバイパス・認可迂回) | テスト環境のみ |

パブリック変数（`NUXT_PUBLIC_*`）はクライアントに露出してよいが、それ以外は不可。

### 禁止操作

- `.env` ファイルの直接読み取り・書き込み（`.env.example` は参照可）
- `cat .env`、`printenv`、`env` などによる環境変数ダンプ
- 機密変数の値をレスポンス・コード・ログ・ドキュメントに含めること
- `curl ... | bash` などのパイプ経由スクリプト実行
- `git push --force`、`git reset --hard`、`rm -rf` などの破壊的操作
- `sudo` による権限昇格

### 環境変数の参照方法

```bash
# NG: 値を出力する
cat .env
echo $NUXT_SUPABASE_SERVICE_KEY

# OK: キー名のみ確認する
grep -E "^NUXT_" .env.example
```

### セキュリティ違反が疑われる場合

1. ツール呼び出しを即座に停止
2. 何を実行しようとしていたか日本語でユーザーに報告
3. 安全な代替手段を提案

---

## プランモード実行時

作成したプランに対して必ず別でエイジェントを立てて、レビューさせること
無理に粗探しする必要はなく、汎用性と再開発、冗長性とメンテナンス性、ロジックのパフォーマンスを重点的にチェックして、改善点や懸念点、他考慮不足があればユーザに共有

## Supabase

- **プロジェクトID**: `vtiaafkycamogbjukwqe`
- **API URL**: `https://vtiaafkycamogbjukwqe.supabase.co`
- **リージョン**: 東京 (ap-northeast-1)
- **認証**: Google OAuth 設定済み

### 未完了・次にやること（優先順）

1. **E2Eテスト**: Playwright導入、認証フロー・主要画面のテスト
2. **OGP生成**: 公開しおりのメタタグ・サムネイル動的生成
3. **パフォーマンス最適化**: Lighthouse監査、フォントCDN化検討

### 作業の進め方

- Agent Teams 体制で並列開発（`.claude/agent-teams.md` 参照）
- 「続きの作業をしてください」→ 上記の「次にやること」を順番に進める
- 「Sprint 2を実行してください」→ Agent Teams体制で並列実行
- 特定タスクを指定することも可能（例: 「AIチャット画面を作って」）

### 開発コマンド

```bash
pnpm install        # パッケージインストール
pnpm dev            # 開発サーバー起動 (http://localhost:3000)
pnpm typecheck      # 型チェック
pnpm lint           # ESLint
pnpm test:unit      # ユニットテスト
pnpm test:nuxt      # Nuxtコンポーネントテスト
pnpm test:rls       # RLSポリシーテスト
```
