import type { ShioriWithRole, Shiori, Day, Event } from '~~/types/database'

/**
 * Realtime ペイロードを現キャッシュの ShioriWithRole へ畳み込む純粋関数群。
 * useShioriEditor から分離することで、
 *   - ロジック単体でテスト可能
 *   - setQueryData コールバック内の IIFE が肥大化するのを避ける
 * ことを狙う。
 *
 * いずれの reducer も `old` をイミュータブルに扱い、差分が無くても
 * 新しい参照を返す点に注意（呼び出し側 patchShiori が setQueryData を常にトリガーする前提）。
 */

type ShioriPayload = { eventType: string; new: Shiori }
type DayPayload = { eventType: string; new: Day; old: { id: string } }
type EventPayload = { eventType: string; new: Event; old: { id: string } }

/**
 * shioris テーブルの変更（UPDATE のみ）をしおり本体に反映。
 * カバー画像・タイトル・日程・公開設定などのスカラー項目が対象。
 */
export function applyShioriChange(old: ShioriWithRole, payload: ShioriPayload): ShioriWithRole {
  return {
    ...old,
    title: payload.new.title,
    start_date: payload.new.start_date,
    end_date: payload.new.end_date,
    area: payload.new.area,
    is_public: payload.new.is_public,
    invite_enabled: payload.new.invite_enabled,
    invite_token: payload.new.invite_token,
    template_id: payload.new.template_id,
    cover_image_url: payload.new.cover_image_url,
  }
}

/**
 * days テーブルの変更（INSERT/UPDATE/DELETE）を days 配列に反映。
 * UPDATE 時は既存の events を保持（day の並び順更新のみで events を空にしない）。
 */
export function applyDayChange(old: ShioriWithRole, payload: DayPayload): ShioriWithRole {
  const days = [...old.days]

  if (payload.eventType === 'INSERT') {
    // 同一 ID が既に存在すれば何もしない（自己変更 or 重複受信対策）
    if (!days.some((d) => d.id === payload.new.id)) {
      days.push({ ...payload.new, events: [] })
      days.sort((a, b) => a.sort_order - b.sort_order)
    }
    return { ...old, days }
  }

  if (payload.eventType === 'UPDATE') {
    const idx = days.findIndex((d) => d.id === payload.new.id)
    if (idx >= 0) {
      // events は現保持分を維持（day 行の更新は events に触れない）
      days[idx] = { ...payload.new, events: days[idx]!.events }
    }
    days.sort((a, b) => a.sort_order - b.sort_order)
    return { ...old, days }
  }

  // DELETE
  return { ...old, days: days.filter((d) => d.id !== payload.old.id) }
}

/**
 * events テーブルの変更（INSERT/UPDATE/DELETE）を各 day.events に反映。
 * UPDATE は day 間移動（day_id 変更）に対応するため、
 *   - 旧 Day から除去
 *   - 新 Day へ追加
 * という 2 ステップに分解する。
 *
 * なお realtimeSync 側の events 購読はフィルタ無しなので、
 * 他しおりの event が渡り得るが、day_id で `days.find` が null を返す → スキップされるため実害は無い。
 */
export function applyEventChange(old: ShioriWithRole, payload: EventPayload): ShioriWithRole {
  // events 配列だけ浅いクローンを作り、以降の mutate はこれに対して行う
  const days = old.days.map((d) => ({ ...d, events: [...d.events] }))

  if (payload.eventType === 'INSERT') {
    const day = days.find((d) => d.id === payload.new.day_id)
    if (day && !day.events.some((e) => e.id === payload.new.id)) {
      day.events.push(payload.new)
      day.events.sort((a, b) => a.sort_order - b.sort_order)
    }
    return { ...old, days }
  }

  if (payload.eventType === 'UPDATE') {
    // 旧 Day から削除（day_id が変わっていれば別 Day から外す）
    for (const day of days) {
      const idx = day.events.findIndex((e) => e.id === payload.new.id)
      if (idx >= 0) {
        if (day.id === payload.new.day_id) {
          // 同一 Day 内更新
          day.events[idx] = payload.new
        }
        else {
          // Day 間移動のため旧 Day から除去
          day.events.splice(idx, 1)
        }
      }
    }
    // 新 Day に未挿入なら追加（Day 間移動時の挿入）
    const targetDay = days.find((d) => d.id === payload.new.day_id)
    if (targetDay && !targetDay.events.some((e) => e.id === payload.new.id)) {
      targetDay.events.push(payload.new)
    }
    // events の並び順を最終的に整える
    for (const day of days) {
      day.events.sort((a, b) => a.sort_order - b.sort_order)
    }
    return { ...old, days }
  }

  // DELETE: どの day にいるか分からないので全 day から探して除去
  for (const day of days) {
    day.events = day.events.filter((e) => e.id !== payload.old.id)
  }
  return { ...old, days }
}
