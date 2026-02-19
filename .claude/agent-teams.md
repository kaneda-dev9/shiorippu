# Agent Teams 開発体制

## 概要
Claude Agent Teams（Opus 4.6）を使用した4エージェント並列開発体制。
Lead + 3 Teammate で効率的にMVPを構築する。

## チーム構成

| エージェント | 役割 | 担当範囲 |
|-------------|------|---------|
| **Lead** | 全体統合・設計 | nuxt.config.ts, 型定義, Supabaseスキーマ, composables, タスク分配, マージ |
| **UI Agent** | 画面実装 | pages/, components/, layouts/, CSS, レスポンシブ |
| **API Agent** | サーバー側 | server/api/, Edge Functions, Claude API連携, Google Maps連携 |
| **Test Agent** | テスト・品質 | Vitest, Playwright, RLSテスト, 動作検証, パフォーマンス |

## Sprint計画

### Sprint 1: 基盤構築 (現在 → 次のステップ)
| エージェント | タスク |
|-------------|--------|
| Lead | プロジェクト設定完了 ✅ → composables整理、共通ユーティリティ |
| UI Agent | ログインページ改善、ダッシュボード完成、レスポンシブ対応 |
| API Agent | server/api/chat/ (Claude API連携), server/api/shiori/ (CRUD API) |
| Test Agent | 認証フローE2Eテスト、RLSポリシーテスト |

### Sprint 2: AIチャット + エディタ
| エージェント | タスク |
|-------------|--------|
| Lead | Realtime統合設計、状態管理最適化 |
| UI Agent | AIチャット画面（選択肢カードUI）、しおりエディタ（ドラッグ&ドロップ） |
| API Agent | Claude Function Calling実装、Google Places API連携 |
| Test Agent | AIチャットフローテスト、エディタ操作テスト |

### Sprint 3: 共同編集 + デザイン
| エージェント | タスク |
|-------------|--------|
| Lead | CRDT検討、パフォーマンス最適化 |
| UI Agent | テンプレート5種実装、プレビュー画面、共有設定画面 |
| API Agent | Realtime (Presence/Broadcast)、招待リンクAPI、PDF出力 |
| Test Agent | リアルタイム同期テスト、マルチユーザーテスト |

### Sprint 4: 地図 + 仕上げ
| エージェント | タスク |
|-------------|--------|
| Lead | 最終統合、デプロイ設定 |
| UI Agent | Google Maps表示、ルート可視化、モバイル最適化 |
| API Agent | Directions API連携、OGP生成、Cloudflare Pages設定 |
| Test Agent | 全画面E2Eテスト、パフォーマンス計測、セキュリティ監査 |

## Agent Teams 実行方法

```bash
# Claude Code で Agent Teams を起動
claude "Sprint 1のUI Agentタスクを実行してください"

# 複数エージェントの並列実行
claude "Agent Teams体制でSprint 1を並列実行してください"
```

## ブランチ戦略
- `main` — 安定版
- `feat/ui-*` — UI Agent作業ブランチ
- `feat/api-*` — API Agent作業ブランチ
- `feat/test-*` — Test Agent作業ブランチ
- Lead が定期的にマージ・コンフリクト解決
