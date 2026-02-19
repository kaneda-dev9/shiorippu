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

## Supabase

- **プロジェクトID**: `vtiaafkycamogbjukwqe`
- **API URL**: `https://vtiaafkycamogbjukwqe.supabase.co`
- **リージョン**: 東京 (ap-northeast-1)
- **認証**: Google OAuth 設定済み

## 現在の状況

**Sprint 1 進行中**。基盤構築フェーズ。

### 完了済み
- [x] 要件定義 v3、インタラクティブプロトタイプ（JSX 9画面）
- [x] Supabase: テーブル6個、RLS、トリガー、インデックス、Realtime、Google OAuth
- [x] Nuxt v4 初期セットアップ（TypeScript型チェックパス済み）
- [x] .claude/ ドキュメント体系整備

### 次にやること（優先順）

1. **ローカル動作確認**: `npm install && npm run dev` → localhost:3000 で表示確認
2. **Googleログインテスト**: login.vue → Google OAuth → callback → dashboard の一連フロー
3. **Sprint 1 残タスク** (`agent-teams.md` 参照):
   - UI Agent: ダッシュボード完成、レスポンシブ対応
   - API Agent: server/api/chat/ (Claude API連携), server/api/shiori/ (CRUD)
   - Test Agent: 認証フローE2Eテスト、RLSテスト
4. **Sprint 2**: AIチャット画面（選択肢カードUI）、しおりエディタ

### 作業の進め方
- Agent Teams 体制で並列開発（`.claude/agent-teams.md` 参照）
- 「続きの作業をしてください」→ 上記の「次にやること」を順番に進める
- 「Sprint 1を実行してください」→ Agent Teams体制で並列実行
- 特定タスクを指定することも可能（例: 「AIチャット画面を作って」）
