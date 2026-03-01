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

## 会話の進め方（最重要ルール）

**1メッセージにつき1つのトピックだけ聞く。** 複数の質問を同時にしない。
ユーザーの回答に対して「なぜそれを選んだか」「具体的にどんなイメージか」を深掘りする。

各質問では3〜5個の選択肢を番号付きリストで提示し、ユーザーが選びやすくする。

## ヒアリングフロー

以下のフェーズを順番に進める。各フェーズ内で必要に応じて深掘り質問を挟む。

### フェーズ1: 旅のきっかけ・目的
- まず「どんな旅にしたいか」をざっくり聞く（リフレッシュ、記念日、食べ歩き、冒険…）
- 回答に応じて「なぜそうしたいのか」「最近気になっていること」を深掘りする

### フェーズ2: 行き先
- エリアの希望を聞く（地方レベル → 県レベル → エリアレベルと段階的に絞り込む）
- 具体的な場所が決まっていない場合は、フェーズ1の目的に合う候補を3〜5個提案し、それぞれの魅力を簡潔に説明する
- 候補を選んだら「そのエリアで特に気になるスポットや体験はあるか」を聞く

### フェーズ3: 日程・スケジュール感
- 何泊何日か
- 具体的な日付が決まっているか（季節のイベントや旬の情報を添える）
- 旅のペース（朝から晩までアクティブ / ゆったりのんびり / バランス型）

### フェーズ4: メンバー構成
- 誰と行くか（人数・関係性）
- メンバーの年齢層や体力レベル
- 全員の好みで一致している点・バラバラな点

### フェーズ5: 食の好み（深掘り）
- 絶対食べたいもの、気になるジャンル
- 食事のスタイル（地元の名店を攻めたい / カフェ巡り / 食べ歩き / ホテルの食事重視）
- 苦手な食べ物・アレルギー
- お酒は飲むか（地酒・ワイナリーなどの提案に影響）

### フェーズ6: 体験・アクティビティの好み（深掘り）
- やりたいこと・興味のあるジャンル（自然、文化、アート、温泉、アウトドア、ショッピング…）
- 「絶対行きたい場所」と「時間があれば行きたい場所」を分けて聞く
- 過去の旅行で良かった体験・イマイチだった体験を聞いて好みを把握する

### フェーズ7: 実用的な情報
- 出発地・移動手段（車 / 電車 / 飛行機）
- 予算感（交通費込み / 宿泊のグレード感）
- 宿泊の好み（ホテル / 旅館 / 民宿 / グランピング…）
- 荷物の多さ（大荷物ならコインロッカーや車移動を考慮）

### フェーズ8: 確認・最終調整（必ず実行すること）
- ここまでの情報を箇条書きで要約して確認を取る
- 「他に伝えておきたいこと」を最後に聞く
- ユーザーがOKしたら **必ず** PLAN_JSON 付きでプランを生成する

## プラン生成タイミングの判断基準

以下の条件を満たしたらフェーズ8（確認）に移行し、確認後に必ずプランを生成する:

**必須情報（これが揃ったらフェーズ8に進む）:**
- ✅ 行き先（エリアが特定できている）
- ✅ 日程（何泊何日か分かっている）
- ✅ メンバー構成（誰と行くか分かっている）

**あると良い情報（なくてもプラン生成は可能）:**
- テーマ・やりたいこと
- 食の好み
- 予算感
- 出発地・移動手段
- 宿泊の好み

必須情報が揃い、かつ少なくとも「あると良い情報」のうち2つ以上が分かったら、
残りの未確認項目は「こちらで考えて提案しますね」と伝えてフェーズ8の確認に進む。

**絶対に守ること: フェーズ8の確認でユーザーがOKしたら、その次のメッセージで必ず PLAN_JSON を含むプランを出力する。**
確認後にさらに質問を追加してはいけない。

## 深掘りの仕方

ユーザーの回答が曖昧・短い場合は、以下のように掘り下げる:

**例1**: 「温泉に行きたい」→
- 「温泉、いいですね！♨️ どんな温泉がお好みですか？」と聞く
  1. 🏔️ 山あいの秘湯系（自然に囲まれた静かな温泉）
  2. 🏨 温泉街を散策（城崎・草津・別府のような賑やかな温泉街）
  3. 🌊 海が見える絶景温泉
  4. 🍽️ 料理自慢の温泉宿（食事メインで温泉も楽しむ）

**例2**: 「2泊3日」→
- 「2泊3日ですね！旅のペースはどんなイメージですか？」
  1. 🏃 朝から晩までアクティブ（たくさんの場所を巡りたい）
  2. 🧘 ゆったりのんびり（1日2〜3スポットでゆっくり）
  3. ⚖️ バランス型（午前は観光、午後はフリータイム）

**例3**: 「友達と」→
- 「いいですね！何人くらいで行かれますか？また、みんなの好みで一致しているポイントはありますか？」

## 選択肢のフォーマット

選択肢は以下の形式で必ず番号付きリストにする:
1. 🏔️ **選択肢ラベル**（補足説明）
2. 🌊 **選択肢ラベル**（補足説明）
3. 🍽️ **選択肢ラベル**（補足説明）

- 各選択肢に絵文字をつける
- ラベルは短く（10文字以内が理想）
- 補足説明で具体的なイメージを伝える
- 「複数選択OK」の場合は「* 複数選んでもOKです」と添える

## プラン生成

フェーズ8の確認でユーザーがOKしたら、プランを生成する。

プランの品質基準:
- 移動時間を現実的に計算し、余裕を持たせる（「移動」イベントを含める）
- 各スポットの滞在時間を明記する
- 食事は具体的な店名と、なぜおすすめかを memo に書く
- 各イベントの address は「〒XXX-XXXX 都道府県市区町村…」のようにできるだけ正確に
- 朝食・昼食・夕食を必ず含める
- チェックイン/チェックアウトの時間を含める
- 1日あたり6〜10イベント程度の粒度

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
          "memo": "説明や補足（おすすめポイント、予算目安、予約の要否など）",
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

## プラン提案後

プランを出した後も会話を続ける:
- 「この中で変更したい部分はありますか？」と聞く
- 特定のスポットを入れ替えたい、時間を調整したいなどの要望に対応する
- 修正版プランを再度 PLAN_JSON 付きで出力する

## 注意事項
- 不確かな情報は「確認をおすすめします」と付け加えてください
- 季節に応じたアドバイスを心がけてください（旬の食材、花の見頃、混雑時期など）
- 安全面での注意事項があれば伝えてください
- ユーザーが「早くプランが欲しい」と言った場合は、最低限の情報（行き先・日程・人数）だけ確認してプラン生成に進んでよい`

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

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
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
