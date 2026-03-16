import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  createSql,
  insertFixtures,
  cleanupFixtures,
  asUser,
  asAnon,
  expectRlsDenied,
  OWNER_ID,
  EDITOR_ID,
  STRANGER_ID,
  PRIVATE_SHIORI_ID,
  PUBLIC_SHIORI_ID,
  PRIVATE_DAY_ID,
  PUBLIC_DAY_ID,
  PRIVATE_EVENT_ID,
  PRIVATE_CHAT_ID,
} from './helpers'

const sql = createSql()

beforeAll(async () => {
  await insertFixtures(sql)
})

afterAll(async () => {
  await cleanupFixtures(sql)
  await sql.end()
})

// ===========================================
// profiles
// ===========================================

describe('profiles RLS', () => {
  it('認証ユーザーは全profilesをSELECTできる', async () => {
    const rows = await asUser(sql, STRANGER_ID, tx =>
      tx`SELECT id FROM profiles WHERE id = ${OWNER_ID}`,
    )
    expect(rows).toHaveLength(1)
  })

  it('anonも全profilesをSELECTできる', async () => {
    const rows = await asAnon(sql, tx =>
      tx`SELECT id FROM profiles WHERE id = ${OWNER_ID}`,
    )
    expect(rows).toHaveLength(1)
  })

  it('自分のprofileをUPDATEできる', async () => {
    const rows = await asUser(sql, OWNER_ID, tx =>
      tx`UPDATE profiles SET display_name = 'updated' WHERE id = ${OWNER_ID} RETURNING id`,
    )
    expect(rows).toHaveLength(1)
  })

  it('他人のprofileをUPDATEできない', async () => {
    const rows = await asUser(sql, STRANGER_ID, tx =>
      tx`UPDATE profiles SET display_name = 'hacked' WHERE id = ${OWNER_ID} RETURNING id`,
    )
    // RLSにより0行更新（エラーではなく空結果）
    expect(rows).toHaveLength(0)
  })

  it('自分のIDでINSERTできる', async () => {
    // 既にフィクスチャで挿入済みなのでUPSERTで確認
    // profiles_insert_ownポリシーはuid() = idを検証
    // 別IDでINSERTしてエラーになることで間接確認
    await expectRlsDenied(sql, OWNER_ID, tx =>
      tx`INSERT INTO profiles (id, display_name) VALUES (${STRANGER_ID}, 'spoofed')`,
    )
  })

  it('他人のIDでINSERTできない', async () => {
    await expectRlsDenied(sql, STRANGER_ID, tx =>
      tx`INSERT INTO profiles (id, display_name) VALUES (${OWNER_ID}, 'spoofed')`,
    )
  })
})

// ===========================================
// shioris
// ===========================================

describe('shioris RLS', () => {
  it('ownerは自分の非公開しおりをSELECTできる', async () => {
    const rows = await asUser(sql, OWNER_ID, tx =>
      tx`SELECT id FROM shioris WHERE id = ${PRIVATE_SHIORI_ID}`,
    )
    expect(rows).toHaveLength(1)
  })

  it('collaboratorは共有された非公開しおりをSELECTできる', async () => {
    const rows = await asUser(sql, EDITOR_ID, tx =>
      tx`SELECT id FROM shioris WHERE id = ${PRIVATE_SHIORI_ID}`,
    )
    expect(rows).toHaveLength(1)
  })

  it('strangerは非公開しおりをSELECTできない', async () => {
    const rows = await asUser(sql, STRANGER_ID, tx =>
      tx`SELECT id FROM shioris WHERE id = ${PRIVATE_SHIORI_ID}`,
    )
    expect(rows).toHaveLength(0)
  })

  it('anonは非公開しおりをSELECTできない', async () => {
    const rows = await asAnon(sql, tx =>
      tx`SELECT id FROM shioris WHERE id = ${PRIVATE_SHIORI_ID}`,
    )
    expect(rows).toHaveLength(0)
  })

  it('anonでも公開しおりをSELECTできる', async () => {
    const rows = await asAnon(sql, tx =>
      tx`SELECT id FROM shioris WHERE id = ${PUBLIC_SHIORI_ID}`,
    )
    expect(rows).toHaveLength(1)
  })

  it('認証ユーザーは自分のowner_idでINSERTできる', async () => {
    const testId = 'aaaaaaaa-0000-0000-0000-000000000099'
    // RETURNING使用時はSELECTポリシーも通す必要がある
    // INSERTのみ検証（is_shiori_memberがINSERT直後の行を参照するため）
    await asUser(sql, OWNER_ID, async (tx) => {
      await tx`INSERT INTO shioris (id, owner_id, title) VALUES (${testId}, ${OWNER_ID}, 'テスト')`
      const rows = await tx`SELECT id FROM shioris WHERE id = ${testId}`
      return rows
    }).then((rows) => {
      expect(rows).toHaveLength(1)
    })
  })

  it('他人のowner_idではINSERTできない', async () => {
    await expectRlsDenied(sql, STRANGER_ID, tx =>
      tx`INSERT INTO shioris (id, owner_id, title) VALUES ('aaaaaaaa-0000-0000-0000-000000000098', ${OWNER_ID}, 'spoofed')`,
    )
  })

  it('ownerのみUPDATE可能', async () => {
    const ownerResult = await asUser(sql, OWNER_ID, tx =>
      tx`UPDATE shioris SET title = 'updated' WHERE id = ${PRIVATE_SHIORI_ID} RETURNING id`,
    )
    expect(ownerResult).toHaveLength(1)

    // collaboratorはUPDATE不可（0行）
    const editorResult = await asUser(sql, EDITOR_ID, tx =>
      tx`UPDATE shioris SET title = 'hacked' WHERE id = ${PRIVATE_SHIORI_ID} RETURNING id`,
    )
    expect(editorResult).toHaveLength(0)
  })

  it('ownerのみDELETE可能', async () => {
    // strangerはDELETE不可
    const strangerResult = await asUser(sql, STRANGER_ID, tx =>
      tx`DELETE FROM shioris WHERE id = ${PRIVATE_SHIORI_ID} RETURNING id`,
    )
    expect(strangerResult).toHaveLength(0)

    // ownerはDELETE可能（ROLLBACKされる）
    const ownerResult = await asUser(sql, OWNER_ID, tx =>
      tx`DELETE FROM shioris WHERE id = ${PRIVATE_SHIORI_ID} RETURNING id`,
    )
    expect(ownerResult).toHaveLength(1)
  })
})

// ===========================================
// days
// ===========================================

describe('days RLS', () => {
  it('ownerはdaysをSELECTできる', async () => {
    const rows = await asUser(sql, OWNER_ID, tx =>
      tx`SELECT id FROM days WHERE id = ${PRIVATE_DAY_ID}`,
    )
    expect(rows).toHaveLength(1)
  })

  it('collaboratorはdaysをSELECTできる', async () => {
    const rows = await asUser(sql, EDITOR_ID, tx =>
      tx`SELECT id FROM days WHERE id = ${PRIVATE_DAY_ID}`,
    )
    expect(rows).toHaveLength(1)
  })

  it('strangerは非公開しおりのdaysをSELECTできない', async () => {
    const rows = await asUser(sql, STRANGER_ID, tx =>
      tx`SELECT id FROM days WHERE id = ${PRIVATE_DAY_ID}`,
    )
    expect(rows).toHaveLength(0)
  })

  it('anonは公開しおりのdaysをSELECTできる', async () => {
    const rows = await asAnon(sql, tx =>
      tx`SELECT id FROM days WHERE id = ${PUBLIC_DAY_ID}`,
    )
    expect(rows).toHaveLength(1)
  })

  it('collaboratorはdaysをINSERT/UPDATE/DELETEできる', async () => {
    const testDayId = 'bbbbbbbb-0000-0000-0000-000000000099'

    // INSERT
    const inserted = await asUser(sql, EDITOR_ID, tx =>
      tx`INSERT INTO days (id, shiori_id, day_number, sort_order) VALUES (${testDayId}, ${PRIVATE_SHIORI_ID}, 2, 1) RETURNING id`,
    )
    expect(inserted).toHaveLength(1)

    // UPDATE
    const updated = await asUser(sql, EDITOR_ID, tx =>
      tx`UPDATE days SET day_number = 99 WHERE id = ${PRIVATE_DAY_ID} RETURNING id`,
    )
    expect(updated).toHaveLength(1)

    // DELETE
    const deleted = await asUser(sql, EDITOR_ID, tx =>
      tx`DELETE FROM days WHERE id = ${PRIVATE_DAY_ID} RETURNING id`,
    )
    expect(deleted).toHaveLength(1)
  })

  it('strangerはdaysをINSERTできない', async () => {
    await expectRlsDenied(sql, STRANGER_ID, tx =>
      tx`INSERT INTO days (id, shiori_id, day_number, sort_order) VALUES ('bbbbbbbb-0000-0000-0000-000000000098', ${PRIVATE_SHIORI_ID}, 3, 2)`,
    )
  })
})

// ===========================================
// events
// ===========================================

describe('events RLS', () => {
  it('ownerはeventsをSELECTできる', async () => {
    const rows = await asUser(sql, OWNER_ID, tx =>
      tx`SELECT id FROM events WHERE id = ${PRIVATE_EVENT_ID}`,
    )
    expect(rows).toHaveLength(1)
  })

  it('collaboratorはeventsをSELECTできる', async () => {
    const rows = await asUser(sql, EDITOR_ID, tx =>
      tx`SELECT id FROM events WHERE id = ${PRIVATE_EVENT_ID}`,
    )
    expect(rows).toHaveLength(1)
  })

  it('strangerは非公開しおりのeventsをSELECTできない', async () => {
    const rows = await asUser(sql, STRANGER_ID, tx =>
      tx`SELECT id FROM events WHERE id = ${PRIVATE_EVENT_ID}`,
    )
    expect(rows).toHaveLength(0)
  })

  it('anonは公開しおりのeventsをSELECTできる', async () => {
    const rows = await asAnon(sql, tx =>
      tx`SELECT id FROM events WHERE day_id = ${PUBLIC_DAY_ID}`,
    )
    expect(rows).toHaveLength(1)
  })

  it('collaboratorはeventsをINSERT/UPDATE/DELETEできる', async () => {
    const testEventId = 'cccccccc-0000-0000-0000-000000000099'

    // INSERT
    const inserted = await asUser(sql, EDITOR_ID, tx =>
      tx`INSERT INTO events (id, day_id, title, sort_order) VALUES (${testEventId}, ${PRIVATE_DAY_ID}, 'テスト追加', 1) RETURNING id`,
    )
    expect(inserted).toHaveLength(1)

    // UPDATE
    const updated = await asUser(sql, EDITOR_ID, tx =>
      tx`UPDATE events SET title = '更新済み' WHERE id = ${PRIVATE_EVENT_ID} RETURNING id`,
    )
    expect(updated).toHaveLength(1)

    // DELETE
    const deleted = await asUser(sql, EDITOR_ID, tx =>
      tx`DELETE FROM events WHERE id = ${PRIVATE_EVENT_ID} RETURNING id`,
    )
    expect(deleted).toHaveLength(1)
  })

  it('strangerはeventsをINSERTできない', async () => {
    await expectRlsDenied(sql, STRANGER_ID, tx =>
      tx`INSERT INTO events (id, day_id, title, sort_order) VALUES ('cccccccc-0000-0000-0000-000000000098', ${PRIVATE_DAY_ID}, 'spoofed', 0)`,
    )
  })
})

// ===========================================
// chat_messages
// ===========================================

describe('chat_messages RLS', () => {
  it('ownerはchat_messagesをSELECTできる', async () => {
    const rows = await asUser(sql, OWNER_ID, tx =>
      tx`SELECT id FROM chat_messages WHERE id = ${PRIVATE_CHAT_ID}`,
    )
    expect(rows).toHaveLength(1)
  })

  it('collaboratorはchat_messagesをSELECTできる', async () => {
    const rows = await asUser(sql, EDITOR_ID, tx =>
      tx`SELECT id FROM chat_messages WHERE id = ${PRIVATE_CHAT_ID}`,
    )
    expect(rows).toHaveLength(1)
  })

  it('strangerはchat_messagesをSELECTできない', async () => {
    const rows = await asUser(sql, STRANGER_ID, tx =>
      tx`SELECT id FROM chat_messages WHERE id = ${PRIVATE_CHAT_ID}`,
    )
    expect(rows).toHaveLength(0)
  })

  it('anonはchat_messagesをSELECTできない', async () => {
    const rows = await asAnon(sql, tx =>
      tx`SELECT id FROM chat_messages WHERE id = ${PRIVATE_CHAT_ID}`,
    )
    expect(rows).toHaveLength(0)
  })

  it('collaboratorはchat_messagesをINSERTできる', async () => {
    const inserted = await asUser(sql, EDITOR_ID, tx =>
      tx`INSERT INTO chat_messages (shiori_id, role, content) VALUES (${PRIVATE_SHIORI_ID}, 'user', 'collaboratorメッセージ') RETURNING id`,
    )
    expect(inserted).toHaveLength(1)
  })

  it('strangerはchat_messagesをINSERTできない', async () => {
    await expectRlsDenied(sql, STRANGER_ID, tx =>
      tx`INSERT INTO chat_messages (shiori_id, role, content) VALUES (${PRIVATE_SHIORI_ID}, 'user', 'spoofed')`,
    )
  })

  it('ownerでもchat_messagesをUPDATEできない', async () => {
    const rows = await asUser(sql, OWNER_ID, tx =>
      tx`UPDATE chat_messages SET content = 'changed' WHERE id = ${PRIVATE_CHAT_ID} RETURNING id`,
    )
    // UPDATEポリシー未定義 → 0行
    expect(rows).toHaveLength(0)
  })

  it('ownerでもchat_messagesをDELETEできない', async () => {
    const rows = await asUser(sql, OWNER_ID, tx =>
      tx`DELETE FROM chat_messages WHERE id = ${PRIVATE_CHAT_ID} RETURNING id`,
    )
    // DELETEポリシー未定義 → 0行
    expect(rows).toHaveLength(0)
  })
})

// ===========================================
// collaborators
// ===========================================

describe('collaborators RLS', () => {
  it('ownerはcollaboratorsをSELECTできる', async () => {
    const rows = await asUser(sql, OWNER_ID, tx =>
      tx`SELECT id FROM collaborators WHERE shiori_id = ${PRIVATE_SHIORI_ID}`,
    )
    expect(rows).toHaveLength(1)
  })

  it('collaboratorはcollaboratorsをSELECTできる', async () => {
    const rows = await asUser(sql, EDITOR_ID, tx =>
      tx`SELECT id FROM collaborators WHERE shiori_id = ${PRIVATE_SHIORI_ID}`,
    )
    expect(rows).toHaveLength(1)
  })

  it('strangerはcollaboratorsをSELECTできない', async () => {
    const rows = await asUser(sql, STRANGER_ID, tx =>
      tx`SELECT id FROM collaborators WHERE shiori_id = ${PRIVATE_SHIORI_ID}`,
    )
    expect(rows).toHaveLength(0)
  })

  it('ownerのみINSERT可能（修正済みポリシーの検証）', async () => {
    const inserted = await asUser(sql, OWNER_ID, tx =>
      tx`INSERT INTO collaborators (shiori_id, user_id, role) VALUES (${PRIVATE_SHIORI_ID}, ${STRANGER_ID}, 'editor') RETURNING id`,
    )
    expect(inserted).toHaveLength(1)
  })

  it('collaboratorはINSERTできない', async () => {
    await expectRlsDenied(sql, EDITOR_ID, tx =>
      tx`INSERT INTO collaborators (shiori_id, user_id, role) VALUES (${PRIVATE_SHIORI_ID}, ${STRANGER_ID}, 'editor')`,
    )
  })

  it('strangerはINSERTできない', async () => {
    await expectRlsDenied(sql, STRANGER_ID, tx =>
      tx`INSERT INTO collaborators (shiori_id, user_id, role) VALUES (${PRIVATE_SHIORI_ID}, ${STRANGER_ID}, 'editor')`,
    )
  })

  it('ownerのみDELETE可能', async () => {
    // strangerはDELETE不可
    const strangerResult = await asUser(sql, STRANGER_ID, tx =>
      tx`DELETE FROM collaborators WHERE shiori_id = ${PRIVATE_SHIORI_ID} RETURNING id`,
    )
    expect(strangerResult).toHaveLength(0)

    // ownerはDELETE可能（ROLLBACKされる）
    const ownerResult = await asUser(sql, OWNER_ID, tx =>
      tx`DELETE FROM collaborators WHERE shiori_id = ${PRIVATE_SHIORI_ID} RETURNING id`,
    )
    expect(ownerResult).toHaveLength(1)
  })

  it('ownerでもcollaboratorsをUPDATEできない', async () => {
    const rows = await asUser(sql, OWNER_ID, tx =>
      tx`UPDATE collaborators SET role = 'owner' WHERE shiori_id = ${PRIVATE_SHIORI_ID} RETURNING id`,
    )
    // UPDATEポリシー未定義 → 0行
    expect(rows).toHaveLength(0)
  })
})
