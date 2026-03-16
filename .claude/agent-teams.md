# Agent Teams 開発体制

## 概要
Claude Agent Teams（Opus 4.6）を使用した4エージェント並列開発体制。
Lead + 3 Teammate で効率的にMVPを構築する。

## チーム構成

| エージェント | 役割 | 担当範囲 |
|-------------|------|---------|
| **Lead** | 全体統合・設計 | nuxt.config.ts, 型定義, Supabaseスキーマ, composables, タスク分配, マージ |
| **UI Agent** | 画面実装 | pages/, components/, layouts/, CSS, レスポンシブ |
| **API Agent** | サーバー側 | server/api/, Claude API連携, Google Maps連携, Google Calendar連携 |
| **Test Agent** | テスト・品質 | Vitest, Playwright, RLSテスト, 動作検証, パフォーマンス |

## Sprint計画

### Sprint 1: 基盤構築 ✅ 完了
| エージェント | タスク | 状態 |
|-------------|--------|------|
| Lead | プロジェクト設定、composables整理、dayjs/VueUse導入 | ✅ |
| UI Agent | レスポンシブヘッダー、モバイルメニュー、トップ・ログイン・ダッシュボード改善 | ✅ |
| API Agent | server/api/shiori/ (CRUD 5本), server/api/chat/ (Claude SSE) | ✅ |
| Test Agent | テスト環境構築 (Vitest設定、3プロジェクト構成) | ✅ |

### Sprint 2: AIチャット + エディタ ✅ 完了
| エージェント | タスク | 状態 |
|-------------|--------|------|
| Lead | Realtime統合設計、状態管理最適化 | ✅ |
| UI Agent | しおりエディタ（ドラッグ&ドロップ）、AIチャットサイドパネル（ChatPanel, PlanPreview） | ✅ |
| API Agent | 日程/イベントCRUD、並び替え、プラン適用API、チャット履歴API | ✅ |
| Test Agent | ユニットテスト・Nuxtテスト作成 | ✅ |

### Sprint 3: 共同編集 + デザイン ✅ 完了
| エージェント | タスク | 状態 |
|-------------|--------|------|
| Lead | Realtime同期、ロールベースUI制御 | ✅ |
| UI Agent | テンプレート選択、ShareModal、招待ページ、公開しおりページ | ✅ |
| API Agent | 招待リンクAPI、コラボレーターAPI、Realtime同期 | ✅ |
| Test Agent | RLSポリシーテスト | ✅ |

### Sprint 4: 地図 + 仕上げ (部分完了)
| エージェント | タスク | 状態 |
|-------------|--------|------|
| Lead | Vercelデプロイ設定、CI/CD構築 | ✅ |
| UI Agent | Google Maps表示 (MapView)、マップイベント一覧、PDF出力UI、カレンダー出力UI | ✅ |
| API Agent | Googleカレンダーエクスポート、Googleトークン暗号化保存 | ✅ |
| Test Agent | E2Eテスト整備 | 🔲 未着手 |

### 残タスク
- E2Eテスト (Playwright)
- OGP生成（メタタグ動的生成）
- パフォーマンス最適化

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
