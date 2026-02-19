import type { ChatRole } from '~~/types/database'

interface ChatRequestMessage {
  role: ChatRole
  content: string
}

/** 旅行プランナーとしてのシステムプロンプト */
const SYSTEM_PROMPT = `あなたは「しおりっぷ」の旅行プランナーAIです。
日本国内旅行のプロフェッショナルとして、ユーザーの旅行計画をサポートします。

## 基本方針
- 親しみやすく丁寧な口調で会話してください
- 絵文字を適度に使って楽しい雰囲気にしてください
- 日本国内旅行に特化した知識を活かしてアドバイスしてください
- 具体的なスポット名、お店の名前を提案する際は、実在する場所を紹介してください

## ヒアリングフロー
ユーザーから旅行について相談された場合、以下のステップで情報を収集してください:
1. 行き先（どのエリアに行きたいか）
2. 日程（何泊何日か）
3. 人数・構成（カップル、家族、友人グループなど）
4. テーマ（グルメ、温泉、観光、アクティビティなど、複数選択可）
5. 予算感
6. 出発地
7. 特別なリクエスト（アレルギー、バリアフリー、ペット同伴など）

各ステップでは3〜5個の選択肢を提示し、「その他」も選べるようにしてください。

## 旅行プラン提案
十分な情報が集まったら、具体的な旅行プランを提案してください:
- 日ごとのスケジュール（時間付き）
- 各スポットの簡単な説明
- 移動手段と所要時間の目安
- おすすめの食事スポット
- 予算の目安

プランを提案する際は、通常のテキスト説明の後に、必ず以下のJSON形式でも出力してください。
このJSONは自動的にしおり（旅程表）に変換されます。

<PLAN_JSON>
{
  "days": [
    {
      "day_number": 1,
      "date": "2024-03-20",
      "events": [
        {
          "title": "イベント名",
          "category": "カテゴリ",
          "start_time": "09:00",
          "end_time": "10:00",
          "memo": "説明や補足",
          "address": "住所"
        }
      ]
    }
  ]
}
</PLAN_JSON>

categoryの値は以下のいずれかを使ってください:
- 移動: transport_train, transport_car, transport_plane, transport_bus, transport_walk, transport_ship
- 食事: meal_restaurant, meal_cafe, meal_izakaya
- 宿泊: stay_hotel, stay_ryokan, stay_camp
- 観光: sightseeing_temple, sightseeing_theme_park, sightseeing_beach, sightseeing_park, sightseeing_museum
- その他: onsen, shopping, photo_spot, activity, memo, other

dateフィールドはしおりの開始日が分かっている場合のみ設定してください。
start_time, end_time は "HH:MM" 形式で設定してください。

## 注意事項
- 不確かな情報は「確認をおすすめします」と付け加えてください
- 季節に応じたアドバイスを心がけてください
- 安全面での注意事項があれば伝えてください`

/**
 * POST /api/chat
 * Claude API を使った AI チャット（ストリーミング対応）
 */
export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const body = await readBody<{
    shioriId?: string
    messages?: ChatRequestMessage[]
  }>(event)

  if (!body?.messages?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'メッセージを入力してください。',
    })
  }

  for (const msg of body.messages) {
    if (!msg.role || !msg.content) {
      throw createError({
        statusCode: 400,
        statusMessage: 'メッセージの形式が不正です。role と content は必須です。',
      })
    }
  }

  const config = useRuntimeConfig()

  if (!config.claudeApiKey) {
    console.error('NUXT_CLAUDE_API_KEY が設定されていません')
    throw createError({
      statusCode: 500,
      statusMessage: 'AIサービスが利用できません。管理者にお問い合わせください。',
    })
  }

  // しおりのコンテキストを取得
  let contextPrompt = ''
  if (body.shioriId) {
    const supabase = useServerSupabase()
    const { data: shiori } = await supabase
      .from('shioris')
      .select('title, area, start_date, end_date')
      .eq('id', body.shioriId)
      .single()

    if (shiori) {
      contextPrompt = `\n\n## 現在のしおり情報\n- タイトル: ${shiori.title}`
      if (shiori.area) contextPrompt += `\n- エリア: ${shiori.area}`
      if (shiori.start_date) contextPrompt += `\n- 開始日: ${shiori.start_date}`
      if (shiori.end_date) contextPrompt += `\n- 終了日: ${shiori.end_date}`
    }
  }

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const anthropic = new Anthropic({ apiKey: config.claudeApiKey })

    const claudeMessages = body.messages!.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }))

    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT + contextPrompt,
      messages: claudeMessages,
    })

    // SSE 形式でストリーミング
    setResponseHeader(event, 'Content-Type', 'text/event-stream')
    setResponseHeader(event, 'Cache-Control', 'no-cache')
    setResponseHeader(event, 'Connection', 'keep-alive')

    const encoder = new TextEncoder()
    let fullAssistantContent = ''

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && 'text' in chunk.delta) {
              fullAssistantContent += chunk.delta.text
              const sseData = `data: ${JSON.stringify({ type: 'text', text: chunk.delta.text })}\n\n`
              controller.enqueue(encoder.encode(sseData))
            } else if (chunk.type === 'message_stop') {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
            }
          }

          const finalMessage = await stream.finalMessage()
          const usageData = `data: ${JSON.stringify({
            type: 'usage',
            usage: {
              input_tokens: finalMessage.usage.input_tokens,
              output_tokens: finalMessage.usage.output_tokens,
            },
          })}\n\n`
          controller.enqueue(encoder.encode(usageData))
          controller.close()

          // ストリーミング完了後にチャット履歴をDBに保存
          if (body.shioriId) {
            const supabase = useServerSupabase()
            const lastUserMessage = body.messages![body.messages!.length - 1]

            // ユーザーメッセージを保存
            if (lastUserMessage?.role === 'user') {
              const { error: userErr } = await supabase
                .from('chat_messages')
                .insert({
                  shiori_id: body.shioriId,
                  role: 'user',
                  content: lastUserMessage.content,
                  metadata: {},
                })
              if (userErr) console.error('ユーザーメッセージ保存エラー:', userErr)
            }

            // AI応答を保存
            if (fullAssistantContent) {
              const { error: assistantErr } = await supabase
                .from('chat_messages')
                .insert({
                  shiori_id: body.shioriId,
                  role: 'assistant',
                  content: fullAssistantContent,
                  metadata: {},
                })
              if (assistantErr) console.error('AI応答保存エラー:', assistantErr)
            }
          }
        } catch (streamError) {
          console.error('ストリーミングエラー:', streamError)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'ストリーミング中にエラーが発生しました。' })}\n\n`))
          controller.close()
        }
      },
    })

    return sendStream(event, readableStream)
  } catch (error: unknown) {
    console.error('Claude API エラー:', error)

    if (error && typeof error === 'object' && 'status' in error) {
      const apiError = error as { status: number }
      if (apiError.status === 429) {
        throw createError({
          statusCode: 429,
          statusMessage: 'AIサービスが混雑しています。しばらく待ってから再試行してください。',
        })
      }
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'AI応答の生成に失敗しました。もう一度お試しください。',
    })
  }
})
