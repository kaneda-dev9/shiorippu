# しおりっぷ — AI旅行プランナー & しおり作成サービス

AIとの対話で旅行プランを作成し、「旅のしおり」として共有できるWebサービスです。

**https://shiorippu-kaneda-dev9s-projects.vercel.app**

## サービス概要

「しおりっぷ」は、国内旅行の計画から共有までをワンストップで完結するサービスです。
AIが旅行先・日程・テーマに合わせた最適なプランを提案し、そのままエディタで編集・共有できます。

### ユーザーフロー

```
Googleログイン → AIチャットで旅行相談 → しおりエディタで編集 → リンクで共有・共同編集
```

### 主な機能

- **AI旅行相談**: Claude APIによるチャット形式のプランニング（Google Places APIで実在スポットを検索・提案）
- **しおりエディタ**: 日程・イベントの追加・編集、ドラッグ&ドロップ並び替え
- **リアルタイム共同編集**: 招待リンクによるGoogle Docs型の同時編集（Supabase Realtime）
- **公開共有**: 認証不要の閲覧リンク発行
- **Googleカレンダー連携**: 旅行プランをワンクリックでGoogleカレンダーにエクスポート
- **PWA対応**: PWAとしてホーム画面へインストールしてネイティブアプリのように操作できます。

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Nuxt 4 / Vue 3.5 / TypeScript |
| UI | Nuxt UI v4 / Tailwind CSS 4 |
| 状態管理 | Pinia |
| バックエンド | Supabase (PostgreSQL / Auth / Realtime) |
| AI | Claude API (Vercel AI SDK / Tool Use / SSE Streaming) |
| 地図 | Google Maps Platform (Places / Directions) |
| CI/CD | GitHub Actions / Vercel |

## アーキテクチャ

```
┌─────────────────────────────────────────────────┐
│  Client (Nuxt 4 SSR/SPA)                       │
│  ┌───────────┐ ┌──────────┐ ┌────────────────┐ │
│  │ AIチャット │ │ エディタ  │ │ リアルタイム同期 │ │
│  └─────┬─────┘ └────┬─────┘ └───────┬────────┘ │
└────────┼────────────┼───────────────┼──────────┘
         │            │               │
    ┌────▼────────────▼───┐    ┌──────▼──────┐
    │  Nuxt Server API    │    │  Supabase   │
    │  (21 endpoints)     │    │  Realtime   │
    │  ┌────────────────┐ │    └─────────────┘
    │  │ Claude API     │ │
    │  │ (Tool Use)     │ │
    │  │  ├ search_places│ │
    │  │  ├ get_details  │ │
    │  │  └ get_directions│
    │  └────────────────┘ │
    └─────────┬───────────┘
              │
    ┌─────────▼───────────┐
    │  Supabase           │
    │  PostgreSQL + RLS   │
    │  6 tables           │
    └─────────────────────┘
```

### 設計上の工夫

**AIチャット**
- Claude API の Tool Use で Google Places / Directions API を呼び出し、実在するスポット情報に基づいたプランを生成
- Vercel AI SDK による SSE ストリーミングでリアルタイムに応答を表示
- 生成されたプランをワンクリックでしおりエディタに反映（構造化JSON → DB INSERT）

**セキュリティ**
- Supabase RLS（Row Level Security）によるデータアクセス制御
- サーバーAPI経由でのDB操作（service role key はサーバーサイドのみ）
- Google OAuth refresh token の AES-256-GCM 暗号化保存

**リアルタイム共同編集**
- Supabase Realtime（Postgres Changes + Presence + Broadcast）
- 招待リンク（UUID v4）による権限管理
- オーナー / エディターのロールベース制御

**コンポーネント設計**
- 3層構造: `atoms/`（汎用UI） → `containers/`（ドメインロジック） → `section/`（ページ固有）
- Nuxt UI v4 のラッパーとして atoms 層を設計し、デザイン一貫性を確保

## データベース設計

```
profiles ──┐
           │1:N
shioris ───┤──── collaborators (owner/editor)
           │1:N
days ──────┤
           │1:N
events     │
           │
chat_messages
```

- 6テーブル構成、全テーブルにRLSポリシー適用
- ヘルパー関数 `is_shiori_member()` / `is_shiori_public()` でポリシーを共通化
- `(select auth.uid())` による initplan 最適化

## 開発環境

### 必要要件

- Node.js 22
- pnpm 10.6+

### セットアップ

```bash
# インストール
pnpm install

# 環境変数の設定
cp .env.example .env
# .env を編集（Supabase, Claude API, Google Maps のキーを設定）

# 開発サーバー起動
pnpm dev
```

### コマンド

```bash
pnpm dev          # 開発サーバー (http://localhost:3000)
pnpm build        # プロダクションビルド
pnpm typecheck    # TypeScript 型チェック
pnpm lint         # ESLint
pnpm test:unit    # ユニットテスト
pnpm test:nuxt    # Nuxt コンポーネントテスト
```

## CI/CD

- **GitHub Actions**: push / PR 時に lint・typecheck・test を並列実行
- **Vercel**: main ブランチへの push で自動デプロイ、PR でプレビューデプロイ
