# RLSテスト実装プラン

## Context
collaborators INSERT ポリシーの脆弱性を修正済み（invite_token未検証 → ownerのみに制限）。
RLSポリシー全体の正しさを自動テストで担保する。`SET LOCAL role` + `request.jwt.claims` がホスト版Supabaseで動作確認済み。

## 方針
- Vitest + `postgres`（Postgres.js）でDBに直接接続
- **`prepare: false` 必須**（Supavisorトランザクションモードでプリペアドステートメント非対応）
- `SET LOCAL role = 'authenticated'` + `set_config('request.jwt.claims', ...)` でユーザー切り替え
- 各テストはトランザクション内で実行し、常にROLLBACKでクリーンアップ
- フィクスチャは `beforeAll` でservice role（デフォルト接続）で挿入、`afterAll` で削除
- `beforeAll` 冒頭で前回残骸の冪等クリーンアップを実行（異常終了対策）

## セットアップ

```bash
pnpm add -D postgres
```

`.env` に追加:
```
DATABASE_URL=postgresql://postgres.[project-id]:[password]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
```

## ファイル構成

| ファイル | 操作 | 内容 |
|---|---|---|
| `test/rls/vitest.config.ts` | 新規 | node環境、dotenvでDATABASE_URL読み込み |
| `test/rls/helpers.ts` | 新規 | DB接続、ヘルパー、フィクスチャ定数 |
| `test/rls/rls-policies.test.ts` | 新規 | 全テストケース（~45件） |
| `vitest.config.ts` | 修正 | projectsに `test/rls/vitest.config.ts` 追加 |
| `package.json` | 修正 | `test:rls` スクリプト追加 |

## テストヘルパー設計

### DB接続
```typescript
const sql = postgres(process.env.DATABASE_URL!, { prepare: false })
```

### フィクスチャユーザー
| 変数名 | UUID | 役割 |
|---|---|---|
| `OWNER_ID` | `00000000-0000-0000-0000-000000000001` | しおりのオーナー |
| `EDITOR_ID` | `00000000-0000-0000-0000-000000000002` | collaborator（editor） |
| `STRANGER_ID` | `00000000-0000-0000-0000-000000000003` | 無関係なユーザー |

### フィクスチャデータ
| テーブル | ID | 内容 |
|---|---|---|
| auth.users | 上記3ユーザー | profiles FK制約のため必要 |
| shioris | `aaaaaaaa-0000-0000-0000-000000000001` | 非公開しおり（OWNER所有） |
| shioris | `aaaaaaaa-0000-0000-0000-000000000002` | 公開しおり（OWNER所有） |
| collaborators | (auto) | EDITOR → 非公開しおり |
| days | `bbbbbbbb-0000-0000-0000-000000000001` | 非公開しおりのDay 1 |
| days | `bbbbbbbb-0000-0000-0000-000000000002` | 公開しおりのDay 1 |
| events | `cccccccc-0000-0000-0000-000000000001` | 非公開しおりのイベント |
| events | `cccccccc-0000-0000-0000-000000000002` | 公開しおりのイベント |
| chat_messages | `dddddddd-0000-0000-0000-000000000001` | 非公開しおりのチャット |

### ヘルパー関数

```typescript
// ユーザーとしてRLSを検証（トランザクション内、常にROLLBACK）
async function asUser<T>(sql, userId, fn): Promise<T>

// anonロールとしてRLSを検証
async function asAnon<T>(sql, fn): Promise<T>

// RLS拒否を検証する専用ヘルパー（可読性向上）
async function expectRlsDenied(sql, userId, fn): Promise<void>
// → expect(asUser(...)).rejects.toThrow(/permission denied|new row violates/)
```

**注意**: SELECTのRLS拒否はエラーではなく空配列。INSERT/UPDATE/DELETEはエラー(42501)になるケースと0 rows affectedになるケースがある。実装時に各ケースの実際の挙動を確認してexpectを合わせる。

### クリーンアップ順序（FK制約順）
```
chat_messages → events → days → collaborators → shioris → profiles → auth.users
```

`beforeAll` 冒頭で同じ順序の冪等クリーンアップを実行し、前回異常終了時の残骸を除去。

## テストケース（6テーブル、~45件）

### profiles（6件）
1. 認証ユーザーは全profilesをSELECTできる
2. anonも全profilesをSELECTできる
3. 自分のprofileをUPDATEできる
4. 他人のprofileをUPDATEできない
5. 自分のIDでINSERTできる
6. 他人のIDでINSERTできない

### shioris（9件）
7. ownerは自分の非公開しおりをSELECTできる
8. collaboratorは共有された非公開しおりをSELECTできる
9. strangerは非公開しおりをSELECTできない（0件）
10. anonは非公開しおりをSELECTできない（0件）
11. anonでも公開しおりをSELECTできる
12. 認証ユーザーは自分のowner_idでINSERTできる
13. 他人のowner_idではINSERTできない
14. ownerのみUPDATE可能（collaborator不可）
15. ownerのみDELETE可能（collaborator不可）

### days（6件）
16. ownerはdaysをSELECTできる
17. collaboratorはdaysをSELECTできる
18. strangerは非公開しおりのdaysをSELECTできない
19. anonは公開しおりのdaysをSELECTできる
20. collaboratorはdaysをINSERT/UPDATE/DELETEできる
21. strangerはdaysをINSERTできない

### events（6件）
22. ownerはeventsをSELECTできる
23. collaboratorはeventsをSELECTできる
24. strangerは非公開しおりのeventsをSELECTできない
25. anonは公開しおりのeventsをSELECTできる
26. collaboratorはeventsをINSERT/UPDATE/DELETEできる
27. strangerはeventsをINSERTできない

### chat_messages（8件）
28. ownerはchat_messagesをSELECTできる
29. collaboratorはchat_messagesをSELECTできる
30. strangerはchat_messagesをSELECTできない
31. anonはchat_messagesをSELECTできない
32. collaboratorはchat_messagesをINSERTできる
33. strangerはchat_messagesをINSERTできない
34. ownerでもchat_messagesをUPDATEできない（ポリシー未定義）
35. ownerでもchat_messagesをDELETEできない（ポリシー未定義）

### collaborators（7件）
36. ownerはcollaboratorsをSELECTできる
37. collaboratorはcollaboratorsをSELECTできる
38. strangerはcollaboratorsをSELECTできない
39. ownerのみINSERT可能（修正済みポリシーの検証）
40. collaborator/strangerはINSERTできない（セキュリティ修正の検証）
41. ownerのみDELETE可能
42. ownerでもcollaboratorsをUPDATEできない（ポリシー未定義）

## 検証方法

```bash
pnpm test:rls    # RLSテストのみ実行
pnpm test:run    # 全テスト実行（unit + nuxt + rls）
```

## 重要ファイル
- `test/rls/helpers.ts` — DB接続・ヘルパー・フィクスチャ定数
- `test/rls/rls-policies.test.ts` — 全テストケース
- `server/utils/auth.ts` — 参照：サーバー側アクセス制御パターン
