import { describe, expect, it, vi } from 'vitest'

// useRuntimeConfigをスタブ（固定の暗号化キー）
const TEST_KEY = 'a'.repeat(64)
vi.stubGlobal('useRuntimeConfig', () => ({
  tokenEncryptionKey: TEST_KEY,
}))

// スタブ後にインポート
const { encryptToken, decryptToken } = await import('~~/server/utils/token-encryption')

describe('token-encryption', () => {
  it('暗号化→復号でラウンドトリップ成功', () => {
    const token = 'my-secret-refresh-token-12345'
    const encrypted = encryptToken(token)
    expect(decryptToken(encrypted)).toBe(token)
  })

  it('暗号化結果がiv:authTag:encryptedの形式', () => {
    const encrypted = encryptToken('test')
    const parts = encrypted.split(':')
    expect(parts).toHaveLength(3)
    // IV = 12バイト = 24文字hex、authTag = 16バイト = 32文字hex
    expect(parts[0]).toMatch(/^[\da-f]{24}$/)
    expect(parts[1]).toMatch(/^[\da-f]{32}$/)
  })

  it('同じ平文でもIVが毎回異なる', () => {
    const e1 = encryptToken('same-token')
    const e2 = encryptToken('same-token')
    expect(e1).not.toBe(e2)
    // IV部分が異なる
    expect(e1.split(':')[0]).not.toBe(e2.split(':')[0])
  })

  it('改ざんされたトークンは復号に失敗', () => {
    const encrypted = encryptToken('test')
    const parts = encrypted.split(':')
    // 暗号文を改ざん
    const tampered = `${parts[0]}:${parts[1]}:${'ff'.repeat(parts[2]!.length / 2)}`
    expect(() => decryptToken(tampered)).toThrow()
  })

  it('不正なフォーマットはエラー', () => {
    expect(() => decryptToken('invalid')).toThrow('Invalid encrypted token format')
    expect(() => decryptToken('a:b')).toThrow('Invalid encrypted token format')
  })

  it('不正な暗号化キーでエラー', () => {
    vi.stubGlobal('useRuntimeConfig', () => ({
      tokenEncryptionKey: 'short-key',
    }))
    // 新しいモジュールインスタンスが必要だが、キャッシュされるので直接テスト
    // getEncryptionKeyは内部関数なので、encrypt/decrypt呼び出し時にチェックされる
    expect(() => encryptToken('test')).toThrow('64-character hex string')

    // テストキーに戻す
    vi.stubGlobal('useRuntimeConfig', () => ({
      tokenEncryptionKey: TEST_KEY,
    }))
  })
})
