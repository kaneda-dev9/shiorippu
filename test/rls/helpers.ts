import postgres from 'postgres'

// フィクスチャユーザーID
export const OWNER_ID = '00000000-0000-0000-0000-000000000001'
export const EDITOR_ID = '00000000-0000-0000-0000-000000000002'
export const STRANGER_ID = '00000000-0000-0000-0000-000000000003'

// フィクスチャデータID
export const PRIVATE_SHIORI_ID = 'aaaaaaaa-0000-0000-0000-000000000001'
export const PUBLIC_SHIORI_ID = 'aaaaaaaa-0000-0000-0000-000000000002'
export const PRIVATE_DAY_ID = 'bbbbbbbb-0000-0000-0000-000000000001'
export const PUBLIC_DAY_ID = 'bbbbbbbb-0000-0000-0000-000000000002'
export const PRIVATE_EVENT_ID = 'cccccccc-0000-0000-0000-000000000001'
export const PUBLIC_EVENT_ID = 'cccccccc-0000-0000-0000-000000000002'
export const PRIVATE_CHAT_ID = 'dddddddd-0000-0000-0000-000000000001'

// DB接続（Supavisorトランザクションモード: prepare: false必須）
export function createSql() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set. Add it to .env')
  return postgres(url, { prepare: false })
}

/**
 * 認証ユーザーとしてRLSを検証（トランザクション内、常にROLLBACK）
 * SET LOCAL はトランザクション終了時に自動リセットされる
 */
export async function asUser<T>(
  sql: postgres.Sql,
  userId: string,
  fn: (tx: postgres.Sql) => Promise<T>,
): Promise<T> {
  // begin → fn → savepoint/rollback で常にクリーンに戻す
  return sql.begin(async (tx) => {
    const claims = JSON.stringify({ sub: userId, role: 'authenticated' })
    await tx.unsafe(`SET LOCAL role = 'authenticated'`)
    await tx.unsafe(`SET LOCAL request.jwt.claims = '${claims}'`)
    const result = await fn(tx)
    // 常にROLLBACK（beginブロック内でエラーを投げる）
    throw new RollbackWithValue(result)
  }).catch((e) => {
    if (e instanceof RollbackWithValue) return e.value as T
    throw e
  })
}

/**
 * anonロールとしてRLSを検証
 */
export async function asAnon<T>(
  sql: postgres.Sql,
  fn: (tx: postgres.Sql) => Promise<T>,
): Promise<T> {
  return sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL role = 'anon'`)
    await tx.unsafe(`SET LOCAL request.jwt.claims = '{}'`)
    const result = await fn(tx)
    throw new RollbackWithValue(result)
  }).catch((e) => {
    if (e instanceof RollbackWithValue) return e.value as T
    throw e
  })
}

/**
 * RLS拒否を検証（INSERT/UPDATE/DELETE → エラー、SELECT → 空配列）
 */
export async function expectRlsDenied(
  sql: postgres.Sql,
  userId: string,
  fn: (tx: postgres.Sql) => Promise<unknown>,
): Promise<void> {
  try {
    await asUser(sql, userId, fn)
    // エラーが出なければテスト失敗
    throw new Error('Expected RLS denial but query succeeded')
  }
  catch (e: unknown) {
    if (e instanceof Error && e.message === 'Expected RLS denial but query succeeded') {
      throw e
    }
    // RLS拒否エラー（42501: insufficient_privilege、または new row violates）
    const msg = (e as Error).message || ''
    if (!msg.includes('permission denied') && !msg.includes('new row violates') && !msg.includes('violates row-level security')) {
      throw new Error(`Unexpected error (expected RLS denial): ${msg}`)
    }
  }
}

// ROLLBACK用の内部ヘルパー
class RollbackWithValue extends Error {
  constructor(public value: unknown) {
    super('ROLLBACK')
  }
}

/**
 * フィクスチャデータの挿入（service roleで実行）
 */
export async function insertFixtures(sql: postgres.Sql) {
  // 冪等クリーンアップ（前回異常終了時の残骸を除去、FK制約順）
  await cleanupFixtures(sql)

  // auth.usersにテストユーザーを作成
  for (const userId of [OWNER_ID, EDITOR_ID, STRANGER_ID]) {
    await sql.unsafe(`
      INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
      VALUES ('${userId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '${userId}@test.local', '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345', now(), now(), now(), '', '', '', '')
    `)
  }

  // profiles（auth.usersトリガーで自動作成される場合があるためON CONFLICT）
  for (const userId of [OWNER_ID, EDITOR_ID, STRANGER_ID]) {
    await sql`
      INSERT INTO profiles (id, display_name)
      VALUES (${userId}, ${'test-user-' + userId.slice(-1)})
      ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name
    `
  }

  // しおり（非公開 + 公開）
  await sql`
    INSERT INTO shioris (id, owner_id, title, is_public)
    VALUES
      (${PRIVATE_SHIORI_ID}, ${OWNER_ID}, 'テスト非公開しおり', false),
      (${PUBLIC_SHIORI_ID}, ${OWNER_ID}, 'テスト公開しおり', true)
  `

  // collaborator（EDITORを非公開しおりに追加）
  await sql`
    INSERT INTO collaborators (shiori_id, user_id, role)
    VALUES (${PRIVATE_SHIORI_ID}, ${EDITOR_ID}, 'editor')
  `

  // days
  await sql`
    INSERT INTO days (id, shiori_id, day_number, sort_order)
    VALUES
      (${PRIVATE_DAY_ID}, ${PRIVATE_SHIORI_ID}, 1, 0),
      (${PUBLIC_DAY_ID}, ${PUBLIC_SHIORI_ID}, 1, 0)
  `

  // events
  await sql`
    INSERT INTO events (id, day_id, title, category, sort_order)
    VALUES
      (${PRIVATE_EVENT_ID}, ${PRIVATE_DAY_ID}, 'テストイベント', 'sightseeing', 0),
      (${PUBLIC_EVENT_ID}, ${PUBLIC_DAY_ID}, '公開イベント', 'sightseeing', 0)
  `

  // chat_messages
  await sql`
    INSERT INTO chat_messages (id, shiori_id, role, content)
    VALUES (${PRIVATE_CHAT_ID}, ${PRIVATE_SHIORI_ID}, 'user', 'テストメッセージ')
  `
}

/**
 * フィクスチャデータの削除（FK制約順）
 */
export async function cleanupFixtures(sql: postgres.Sql) {
  const userIds = [OWNER_ID, EDITOR_ID, STRANGER_ID]
  const shioriIds = [PRIVATE_SHIORI_ID, PUBLIC_SHIORI_ID]

  // FK制約順に削除
  await sql`DELETE FROM chat_messages WHERE shiori_id = ANY(${shioriIds})`
  await sql`DELETE FROM events WHERE day_id IN (SELECT id FROM days WHERE shiori_id = ANY(${shioriIds}))`
  await sql`DELETE FROM days WHERE shiori_id = ANY(${shioriIds})`
  await sql`DELETE FROM collaborators WHERE shiori_id = ANY(${shioriIds})`
  await sql`DELETE FROM shioris WHERE id = ANY(${shioriIds})`
  await sql`DELETE FROM profiles WHERE id = ANY(${userIds})`
  for (const userId of userIds) {
    await sql.unsafe(`DELETE FROM auth.users WHERE id = '${userId}'`)
  }
}
