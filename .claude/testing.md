# テスト方針

## テストツール (導入予定)

| ツール | 用途 |
|--------|------|
| Vitest | ユニットテスト (composables, stores, utils) |
| @vue/test-utils | コンポーネントテスト |
| Playwright | E2Eテスト |

## テスト優先度

### 高 (MVP必須)
- 認証フロー (ログイン → コールバック → リダイレクト)
- しおりCRUD (作成、読み取り、更新、削除)
- RLSポリシー (他人のデータにアクセスできないこと)

### 中 (Phase 2)
- AIチャットフロー (選択肢送信 → 応答)
- 共同編集 (招待リンク → 参加 → リアルタイム同期)
- ドラッグ&ドロップの並べ替え

### 低 (Phase 3)
- PDF出力
- テンプレート切り替え
- Google Maps統合

## ローカル動作確認手順

```bash
# 1. パッケージインストール
pnpm install

# 2. 環境変数設定 (.envにSupabase URL、Anon Key、Service Key が設定済み)
#    NUXT_CLAUDE_API_KEY を Anthropic Console から取得して追加

# 3. 開発サーバー起動 (ENFILE エラー時は ulimit -n 10240 を先に実行)
pnpm dev

# 4. ブラウザで確認
#    http://localhost:3000        → トップページ
#    http://localhost:3000/login  → Googleログイン → コールバック → ダッシュボード
#    http://localhost:3000/dashboard → マイしおり一覧、新規作成

# 5. 型チェック
pnpm typecheck
```

## Supabase RLS テスト方針

```sql
-- anon ユーザーとして公開しおりが見えるか
SELECT * FROM shioris WHERE is_public = true;

-- 他人のしおりが見えないか (認証済みユーザーとして)
SELECT * FROM shioris; -- 自分のもの + 公開のもの + コラボ参加中のもの のみ

-- イベントのCRUD操作がメンバーのみ許可されるか
INSERT INTO events (day_id, title) VALUES ('non-member-day-id', 'test');
-- → RLS violation expected
```
