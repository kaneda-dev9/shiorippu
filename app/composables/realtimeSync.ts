import type { RealtimeChannel } from '@supabase/supabase-js'
import type { PresenceUser, Day, Event, Shiori } from '~~/types/database'
import { tryOnScopeDispose } from '@vueuse/core'

interface RealtimeSyncOptions {
  shioriId: string
  onShioriChange?: (payload: { eventType: string; new: Shiori }) => void
  onDayChange?: (payload: { eventType: string; new: Day; old: { id: string } }) => void
  onEventChange?: (payload: { eventType: string; new: Event; old: { id: string } }) => void
}

/**
 * しおりのリアルタイム同期 + Presence
 * - Postgres Changes: days/events テーブルの変更を subscribe
 * - Presence: オンラインユーザーを追跡
 */
export function useRealtimeSync(options: RealtimeSyncOptions) {
  const supabase = useSupabase()
  const { user, profile } = useAuth()

  const onlineUsers = ref<PresenceUser[]>([])
  const pendingOps = new Set<string>()
  let channel: RealtimeChannel | null = null

  /** 自分の変更として追跡（Realtime受信時にスキップ用） */
  function addPendingOp(id: string) {
    pendingOps.add(id)
    // 5秒後に自動削除（安全策）
    setTimeout(() => pendingOps.delete(id), 5000)
  }

  /** Presence 状態を更新 */
  function updatePresence() {
    if (!channel || !user.value) return

    const presenceState: PresenceUser = {
      user_id: user.value.id,
      display_name: profile.value?.display_name || null,
      avatar_url: profile.value?.avatar_url || null,
      online_at: new Date().toISOString(),
    }

    channel.track(presenceState)
  }

  /** Presence の sync イベントからオンラインユーザーを更新 */
  function handlePresenceSync() {
    if (!channel) return
    const state = channel.presenceState()
    const users: PresenceUser[] = []
    const seen = new Set<string>()

    for (const key of Object.keys(state)) {
      const presences = state[key] as unknown as PresenceUser[]
      for (const p of presences) {
        if (!seen.has(p.user_id)) {
          seen.add(p.user_id)
          users.push(p)
        }
      }
    }

    onlineUsers.value = users
  }

  /** チャネルをセットアップ */
  function setupChannel() {
    const channelName = `shiori:${options.shioriId}`

    channel = supabase.channel(channelName, {
      config: { presence: { key: user.value?.id || 'anonymous' } },
    })

    // Shioris テーブルの変更を監視（タイトル、日付、エリア等）
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'shioris',
        filter: `id=eq.${options.shioriId}`,
      },
      (payload) => {
        const record = payload.new as Shiori
        if (record?.id && pendingOps.has(record.id)) {
          pendingOps.delete(record.id)
          return
        }
        options.onShioriChange?.({
          eventType: payload.eventType,
          new: record,
        })
      },
    )

    // Days テーブルの変更を監視
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'days',
        filter: `shiori_id=eq.${options.shioriId}`,
      },
      (payload) => {
        const record = (payload.new as Day) || (payload.old as { id: string })
        const recordId = record?.id
        if (recordId && pendingOps.has(recordId)) {
          pendingOps.delete(recordId)
          return
        }
        options.onDayChange?.({
          eventType: payload.eventType,
          new: payload.new as Day,
          old: payload.old as { id: string },
        })
      },
    )

    // Events テーブルの変更を監視
    // events は shiori_id を直接持たないので、フィルタなしで受信し、
    // コールバック側で day_id の所属をチェックする
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'events',
      },
      (payload) => {
        const record = (payload.new as Event) || (payload.old as { id: string })
        const recordId = record?.id
        if (recordId && pendingOps.has(recordId)) {
          pendingOps.delete(recordId)
          return
        }
        options.onEventChange?.({
          eventType: payload.eventType,
          new: payload.new as Event,
          old: payload.old as { id: string },
        })
      },
    )

    // Presence
    channel.on('presence', { event: 'sync' }, handlePresenceSync)

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        updatePresence()
      }
    })
  }

  /** クリーンアップ */
  function cleanup() {
    if (channel) {
      channel.unsubscribe()
      supabase.removeChannel(channel)
      channel = null
    }
  }

  onMounted(() => {
    setupChannel()
  })

  // スコープ破棄時にチャネルをクリーンアップ
  tryOnScopeDispose(cleanup)

  return {
    onlineUsers: readonly(onlineUsers),
    addPendingOp,
  }
}
