# テスト方針

## テストツール

| ツール | 用途 | 状態 |
|--------|------|------|
| Vitest | ユニットテスト (composables, stores, utils) | 導入済み |
| @nuxt/test-utils | Nuxtコンポーネントテスト | 導入済み |
| @vue/test-utils | Vueコンポーネントテスト | 導入済み |
| happy-dom | テスト用DOM環境 | 導入済み |
| postgres | RLSポリシーテスト用DB接続 | 導入済み |
| Playwright | E2Eテスト | 未導入 |

## テストプロジェクト構成

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    projects: [
      'test/unit/vitest.config.ts',   // ユニットテスト
      'test/nuxt/vitest.config.ts',   // Nuxtコンポーネントテスト
      'test/rls/vitest.config.ts',    // Supabase RLSポリシーテスト
    ],
  },
})
```

## テスト実行コマンド

```bash
pnpm test           # 全テスト実行 (watch mode)
pnpm test:run       # 全テスト実行 (1回)
pnpm test:unit      # ユニットテストのみ
pnpm test:nuxt      # Nuxtコンポーネントテストのみ
pnpm test:rls       # RLSポリシーテストのみ
pnpm test:agent     # エージェント対応レポーター
```

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

## CI

GitHub Actions で push / PR 時に以下を並列実行:
- `pnpm lint` — ESLintチェック
- `pnpm typecheck` — TypeScript型チェック
- `pnpm test:unit --run` + `pnpm test:nuxt --run` — テスト実行
