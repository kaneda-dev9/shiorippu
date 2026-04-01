import { Chat } from '@ai-sdk/vue'
import { DefaultChatTransport } from 'ai'
import type { UIMessage, ChatStatus } from 'ai'

export interface ChatStreamResult {
  messages: Readonly<Ref<UIMessage[]>>
  status: Readonly<Ref<ChatStatus>>
  sendMessage: (text: string) => Promise<void>
  stopStreaming: () => void
  loadHistory: () => Promise<void>
}

export function useChatStream(shioriId: string): ChatStreamResult {
  const { authFetch } = useAuthFetch()
  const { session } = useAuth()
  const toast = useToast()

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
    scope = effectScope()
    scope.run(() => {
      watchEffect(() => { statusRef.value = chatInstance.status })
      watchEffect(() => { messagesRef.value = chatInstance.messages })
    })
  }

  /** チャット履歴を取得 */
  async function loadHistory() {
    try {
      const data = await authFetch<{ id: string; role: string; content: string }[]>(
        `/api/chat/${shioriId}/messages`,
      )
      const historyMessages: UIMessage[] = data.map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        parts: [{ type: 'text' as const, text: m.content }],
      }))
      initChat(historyMessages)
    }
    catch {
      // 履歴がなくても初期化
      initChat()
    }
  }

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
    loadHistory,
  }
}
