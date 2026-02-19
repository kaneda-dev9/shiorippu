# しおりっぷ (Shiorippu)

AIと一緒に旅のプランを作成し、おしゃれな「旅のしおり」を作れるWebサービス。
国内旅行（日本）に特化。個人開発・趣味プロジェクト。

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
> - 新しいパッケージ追加・バージョン変更 → `dependencies.md`
> - ファイル構成変更・新パターン導入 → `architecture.md`
> - 新コンポーネント追加・UI方針変更 → `components.md`
> - Sprint完了・タスクステータス変更 → `agent-teams.md`, `CLAUDE.md`
> - Supabase スキーマ変更 → `architecture.md`, `requirements.md`
> - 開発ルール・パターンの変更 → `rules/` 配下

## Supabase

- **プロジェクトID**: `vtiaafkycamogbjukwqe`
- **API URL**: `https://vtiaafkycamogbjukwqe.supabase.co`
- **リージョン**: 東京 (ap-northeast-1)
- **認証**: Google OAuth 設定済み

## 現在の状況

**Sprint 1 完了 → Sprint 2 開始待ち**

### 完了済み
- [x] 要件定義 v3、インタラクティブプロトタイプ（JSX 9画面）
- [x] Supabase: テーブル6個、RLS、トリガー、インデックス、Realtime、Google OAuth
- [x] Nuxt v4 初期セットアップ（TypeScript型チェックパス済み）
- [x] .claude/ ドキュメント体系整備
- [x] 開発環境: Node.js 22 + pnpm、Nuxt UI v4 セットアップ
- [x] Google OAuth ログインフロー動作確認済み（PKCE）
- [x] UI改善: レスポンシブヘッダー、モバイルメニュー、トップ・ログイン・ダッシュボード
- [x] Server API: しおりCRUD 5エンドポイント、AIチャット（SSEストリーミング）
- [x] composables: useAuth, useSupabase, useAuthFetch
- [x] ユーティリティ: dayjs日付フォーマット、サーバー認証ヘルパー

### 次にやること（優先順）

1. **Sprint 2: しおりエディタ画面** (`/shiori/[id]`): 基本情報編集、日程・イベント管理
2. **Sprint 2: AIチャット画面** (`/shiori/[id]/plan`): 選択肢カードUIでAIと旅行プランを作成
3. **テスト整備**: 認証フローE2E、RLSテスト（Sprint 1 残タスク）
4. **Sprint 3**: 共同編集（Realtime）、デザインテンプレート

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
```
