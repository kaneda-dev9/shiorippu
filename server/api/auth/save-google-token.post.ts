/** Google refresh_token を profiles テーブルに暗号化して保存 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody<{ refreshToken: string }>(event)

  if (!body.refreshToken || typeof body.refreshToken !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'refreshToken は必須です。',
    })
  }

  const encrypted = encryptToken(body.refreshToken)
  const supabase = useServerSupabase()

  const { error } = await supabase
    .from('profiles')
    .update({ google_refresh_token: encrypted })
    .eq('id', user.id)

  if (error) {
    console.error('Failed to save Google refresh token:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'トークンの保存に失敗しました。',
    })
  }

  return { success: true }
})
