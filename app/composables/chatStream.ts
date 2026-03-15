import { Chat } from '@ai-sdk/vue'
import { DefaultChatTransport } from 'ai'
import type { UIMessage, ChatStatus } from 'ai'

export interface ChatStreamResult {
  messages: Ref<UIMessage[]>
  status: Ref<ChatStatus>
  sendMessage: (text: string) => Promise<void>
  stopStreaming: () => void
  loadHistory: () => Promise<void>
}

export function useChatStream(shioriId: string): ChatStreamResult {
  const { authFetch } = useAuthFetch()
  const { session } = useAuth()
  const toast = useToast()

  // Chat インスタンスのリアクティブラッパー
  const messages = ref<UIMessage[]>([]) as Ref<UIMessage[]>
  const status = ref<ChatStatus>('ready') as Ref<ChatStatus>

  let chat: Chat<UIMessage> | null = null

  /** Chat インスタンスを初期化（クライアントサイドのみ） */
  function initChat(initialMessages?: UIMessage[]) {
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

    // リアクティブ同期: Chat の内部 state を Vue ref にバインド
    // Chat クラスは内部で Vue ref を使っているので、watchEffect で同期
    watchEffect(() => {
      messages.value = chat!.messages
      status.value = chat!.status
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
    if (status.value === 'streaming' || status.value === 'submitted') return

    await chat.sendMessage({ text: text.trim() })
  }

  return {
    messages,
    status,
    sendMessage,
    stopStreaming,
    loadHistory,
  }
}
