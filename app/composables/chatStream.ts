import { Chat } from '@ai-sdk/vue'
import { DefaultChatTransport } from 'ai'
import type { UIMessage, ChatStatus } from 'ai'

export interface ChatStreamResult {
  messages: Readonly<Ref<UIMessage[]>>
  status: Readonly<Ref<ChatStatus>>
  sendMessage: (text: string) => Promise<void>
  stopStreaming: () => void
}

export function useChatStream(shioriId: string): ChatStreamResult {
  const { authFetch } = useAuthFetch()
  const { session, loading: authLoading } = useAuth()
  const toast = useToast()
  const queryCache = useQueryCache()

  let chat: Chat<UIMessage> | null = null
  const statusRef = ref<ChatStatus>('ready') as Ref<ChatStatus>
  const messagesRef = ref<UIMessage[]>([]) as Ref<UIMessage[]>

  // 外部には readonly で公開（書き込み防止）
  const messages = readonly(messagesRef) as Readonly<Ref<UIMessage[]>>
  const status = readonly(statusRef) as Readonly<Ref<ChatStatus>>

  // watchEffect のスコープ管理（非同期コンテキストでもリアクティビティを維持）
  let scope: ReturnType<typeof effectScope> | null = null

  /** Chat インスタンスを初期化（クライアントサイドのみ） */
  function initChat(initialMessages?: UIMessage[]) {
    // 既存のスコープを破棄
    scope?.stop()

    chat = new Chat<UIMessage>({
      messages: initialMessages,
      transport: new DefaultChatTransport({
        api: '/api/chat',
        headers: () => {
          const token = session.value?.access_token
          const headers: Record<string, string> = {}
          if (token) headers['Authorization'] = `Bearer ${token}`
          return headers
        },
        body: { shioriId },
      }),
      onError: (error) => {
        console.error('チャットエラー:', error)
        toast.add({ title: 'AI応答の取得に失敗しました', color: 'error' })
      },
    })

    // Chat の公開 getter 経由でリアクティブ同期
    const chatInstance = chat
    // streaming → ready 遷移後にキャッシュを invalidate（再マウント時に最新を反映）
    const hasStreamed = ref(false)

    scope = effectScope()
    scope.run(() => {
      watchEffect(() => { statusRef.value = chatInstance.status })
      watchEffect(() => { messagesRef.value = chatInstance.messages })
      watch(statusRef, (s) => {
        if (s === 'streaming') {
          hasStreamed.value = true
        }
        if (s === 'ready' && hasStreamed.value) {
          queryCache.invalidateQueries({ key: chatKeys.messages(shioriId) })
          hasStreamed.value = false
        }
      })
    })
  }

  // Pinia Colada で履歴を取得（認証後のみ）
  const { data: history, error } = useQuery({
    key: () => chatKeys.messages(shioriId),
    query: () => authFetch<{ id: string; role: string; content: string }[]>(
      `/api/chat/${shioriId}/messages`,
    ),
    enabled: () => !authLoading.value && !!session.value,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

  // 履歴取得後に Chat を初期化
  watch(history, (msgs) => {
    if (msgs && !chat) {
      const initial: UIMessage[] = msgs.map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        parts: [{ type: 'text' as const, text: m.content }],
      }))
      initChat(initial)
    }
  }, { immediate: true })

  // 履歴取得失敗時も空で初期化
  watch(error, (e) => {
    if (e && !chat) initChat()
  })

  /** ストリーミングを中断 */
  function stopStreaming() {
    chat?.stop()
  }

  /** メッセージ送信 */
  async function sendMessage(text: string) {
    if (!text.trim() || !chat) return
    if (statusRef.value === 'streaming' || statusRef.value === 'submitted') return

    await chat.sendMessage({ text: text.trim() })
  }

  // コンポーネント破棄時にスコープをクリーンアップ
  tryOnScopeDispose(() => scope?.stop())

  return {
    messages,
    status,
    sendMessage,
    stopStreaming,
  }
}
