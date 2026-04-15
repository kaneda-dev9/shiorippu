import type { CollaboratorWithProfile } from '~~/types/database'

/**
 * GET /api/shiori/:id/collaborators
 * コラボレーター一覧を取得（メンバーのみ）
 * オーナーを仮想的にリスト先頭に含める
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'しおりIDが指定されていません。',
    })
  }

  // メンバーのみアクセス可能
  await requireShioriAccess(event, id)

  const supabase = useServerSupabase()

  // しおりのオーナー情報
  const { data: shiori } = await supabase
    .from('shioris')
    .select('owner_id')
    .eq('id', id)
    .single()

  if (!shiori) {
    throw createError({ statusCode: 404, statusMessage: 'しおりが見つかりません。' })
  }

  // オーナーのプロフィール（UI表示に必要なフィールドのみ取得）
  const { data: ownerProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .eq('id', shiori.owner_id)
    .single()

  if (profileError) {
    console.error('オーナープロフィール取得エラー:', profileError)
  }

  // コラボレーター一覧（オーナーは仮想エントリで追加するので除外）
  const { data: collaborators, error } = await supabase
    .from('collaborators')
    .select('*')
    .eq('shiori_id', id)
    .neq('user_id', shiori.owner_id)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('コラボレーター取得エラー:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'コラボレーター一覧の取得に失敗しました。',
    })
  }

  // コラボレーターのプロフィールを一括取得
  const userIds = (collaborators || []).map((c) => c.user_id)
  let profiles: Record<string, typeof ownerProfile> = {}

  if (userIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', userIds)

    if (profilesData) {
      profiles = Object.fromEntries(profilesData.map((p) => [p.id, p]))
    }
  }

  // プロフィールを結合
  const collabsWithProfile: CollaboratorWithProfile[] = (collaborators || []).map((c) => ({
    ...c,
    profile: profiles[c.user_id] || null,
  }))

  // オーナーを仮想コラボレーターとして先頭に追加
  const ownerEntry: CollaboratorWithProfile = {
    id: 'owner',
    shiori_id: id,
    user_id: shiori.owner_id,
    role: 'owner',
    last_active: new Date().toISOString(),
    created_at: new Date().toISOString(),
    profile: ownerProfile || null,
  }

  return [ownerEntry, ...collabsWithProfile]
})
