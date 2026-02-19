/**
 * 認証トークン付きの $fetch ラッパー
 * サーバーAPIにユーザーのアクセストークンを自動付与する
 */
export function useAuthFetch() {
  const { session } = useAuth()

  async function authFetch<T>(url: string, options: Parameters<typeof $fetch>[1] = {}): Promise<T> {
    const token = session.value?.access_token
    if (!token) {
      throw new Error('認証が必要です。ログインしてください。')
    }

    return $fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    }) as Promise<T>
  }

  return { authFetch }
}
