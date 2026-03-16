import { describe, expect, it } from 'vitest'
import { mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'

// useAuth をモック
const { useAuthMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
}))

mockNuxtImport('useAuth', () => useAuthMock)

describe('useAuthFetch', () => {
  // テスト用エンドポイント
  registerEndpoint('/api/test', () => ({ ok: true }))

  it('認証済みの場合、Authorizationヘッダー付きでリクエストする', async () => {
    useAuthMock.mockReturnValue({
      session: ref({ access_token: 'test-token-123' }),
    })

    const { authFetch } = useAuthFetch()
    const result = await authFetch<{ ok: boolean }>('/api/test')
    expect(result.ok).toBe(true)
  })

  it('未認証の場合、エラーをスローする', async () => {
    useAuthMock.mockReturnValue({
      session: ref(null),
    })

    const { authFetch } = useAuthFetch()
    await expect(authFetch('/api/test')).rejects.toThrow('認証が必要です')
  })
})
