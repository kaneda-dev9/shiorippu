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

### Sprint 1: 基盤構築 ✅ 完了
| エージェント | タスク | 状態 |
|-------------|--------|------|
| Lead | プロジェクト設定、composables整理、dayjs/VueUse導入 | ✅ |
| UI Agent | レスポンシブヘッダー、モバイルメニュー、トップ・ログイン・ダッシュボード改善 | ✅ |
| API Agent | server/api/shiori/ (CRUD 5本), server/api/chat/ (Claude SSE) | ✅ |
| Test Agent | 認証フローE2Eテスト、RLSポリシーテスト | 🔲 未着手 |

### Sprint 2: AIチャット + エディタ ✅ 完了
| エージェント | タスク | 状態 |
|-------------|--------|------|
| Lead | Realtime統合設計、状態管理最適化 | ✅ |
| UI Agent | しおりエディタ（ドラッグ&ドロップ）、AIチャットサイドパネル（ChatPanel, PlanPreview） | ✅ |
| API Agent | 日程/イベントCRUD、並び替え、プラン適用API、チャット履歴API | ✅ |
| Test Agent | AIチャットフローテスト、エディタ操作テスト | 🔲 未着手 |

### Sprint 3: 共同編集 + デザイン ✅ 完了
| エージェント | タスク | 状態 |
|-------------|--------|------|
| Lead | Realtime同期、ロールベースUI制御 | ✅ |
| UI Agent | テンプレート選択、ShareModal、招待ページ、公開しおりページ | ✅ |
| API Agent | 招待リンクAPI、コラボレーターAPI、Realtime同期 | ✅ |
| Test Agent | リアルタイム同期テスト、マルチユーザーテスト | 🔲 未着手 |

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
