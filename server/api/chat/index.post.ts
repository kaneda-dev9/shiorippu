import type { ChatRole } from '~~/types/database'
import { searchPlaces, getPlaceDetails, getDirections } from '~~/server/utils/google-maps'

interface ChatRequestMessage {
  role: ChatRole
  content: string
}

// --- ツール定義 ---

/** カスタムツール（Google Maps Platform） */
const CUSTOM_TOOLS = [
  {
    name: 'search_places',
    description: 'Google Places APIでスポットを検索する。レストラン、カフェ、観光地、ホテルなど日本国内の実在する場所を検索できる。スポットを提案する前に必ずこのツールで実在を確認すること。',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: '検索クエリ（例: "京都 抹茶カフェ", "箱根 温泉旅館"）' },
        location: { type: 'string', description: '検索エリア（例: "京都市", "箱根町"）。query に含まれていない場合に指定' },
        type: { type: 'string', description: 'Google Places タイプ（restaurant, cafe, tourist_attraction, lodging, spa 等）。絞り込みたい場合に指定' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_place_details',
    description: '特定のスポットの詳細情報を取得する（住所、営業時間、評価、口コミ数、公式サイト）。search_places で見つけた place_id を使う。',
    input_schema: {
      type: 'object' as const,
      properties: {
        place_id: { type: 'string', description: 'Google Places のプレースID（search_places の結果に含まれる placeId）' },
      },
      required: ['place_id'],
    },
  },
  {
    name: 'get_directions',
    description: '2地点間の移動ルート・所要時間・距離を取得する。プランの移動時間を現実的に計算するために使う。',
    input_schema: {
      type: 'object' as const,
      properties: {
        origin: { type: 'string', description: '出発地（住所または場所名）' },
        destination: { type: 'string', description: '目的地（住所または場所名）' },
        mode: {
          type: 'string',
          enum: ['driving', 'walking', 'transit'],
          description: '移動手段（driving=車, walking=徒歩, transit=公共交通機関）。デフォルトは transit',
        },
      },
      required: ['origin', 'destination'],
    },
  },
] as const

/** 旅行プランナーとしてのシステムプロンプト */
const SYSTEM_PROMPT = `あなたは「しおりっぷ」の旅行プランナーAIです。
日本国内旅行のプロフェッショナルとして、ユーザーの旅行計画をサポートします。

## 基本方針
- 親しみやすく丁寧な口調で会話してください
- 絵文字を適度に使って楽しい雰囲気にしてください
- 日本国内旅行に特化した知識を活かしてアドバイスしてください
- 具体的なスポット名、お店の名前を提案する際は、実在する場所を紹介してください

## 利用可能なツール

あなたは以下のツールを使って、正確な情報に基づいた提案ができます:

- **search_places**: Google Places API でレストラン・観光地・ホテルなどを検索し、実在のスポットを見つける
- **get_place_details**: スポットの住所・営業時間・評価・公式サイトなどの詳細を取得
- **get_directions**: 2地点間の移動ルート・所要時間を計算（車・電車・徒歩）
- **web_search**: 最新の旅行情報、季節のイベント、口コミ、営業状況などをWeb検索

### ツール利用の方針
- **ヒアリングフェーズ（フェーズ1〜7）**: エリアの候補を提案する際や、ユーザーが特定のスポットについて質問した場合にツールを使う
- **プラン生成フェーズ（フェーズ8以降）**: 必ず search_places でスポットの実在を確認し、get_directions で移動時間を検証する
- 季節のイベント・最新情報は web_search で確認する
- ツール結果をそのまま表示せず、自然な会話文にまとめて伝える
- 検索結果に含まれる rating（評価）や userRatingCount（口コミ数）は信頼度の参考にする

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
- 選択肢はデフォルトで複数選択可能としてUIに表示される
- 1つだけ選んでほしい質問（出発地、日程の日数、宿泊タイプなど具体的に1つを決める必要がある場合）は「* 1つ選んでください」と添える
- テーマ・好み・やりたいことなど複数当てはまる質問では何も添えなくてよい（デフォルトで複数選択になる）

## プラン生成

フェーズ8の確認でユーザーがOKしたら、プランを生成する。

プランの品質基準:
- **search_places で各スポットの実在を確認**してから提案する
- **get_directions で移動時間を検証**し、余裕を持たせる（「移動」イベントを含める）
- 各スポットの滞在時間を明記する
- 食事は具体的な店名と、なぜおすすめかを memo に書く
- 各イベントの address はツールで取得した正確な住所を使う
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

// --- ツール実行 ---

/** カスタムツールを実行して結果を JSON 文字列で返す */
async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  try {
    switch (name) {
      case 'search_places': {
        const results = await searchPlaces(
          input.query as string,
          input.location as string | undefined,
          input.type as string | undefined,
        )
        if (results.length === 0) return JSON.stringify({ message: '該当するスポットが見つかりませんでした。検索条件を変えてみてください。' })
        return JSON.stringify(results)
      }
      case 'get_place_details': {
        const result = await getPlaceDetails(input.place_id as string)
        if (!result) return JSON.stringify({ error: 'スポット情報の取得に失敗しました。' })
        return JSON.stringify(result)
      }
      case 'get_directions': {
        const result = await getDirections(
          input.origin as string,
          input.destination as string,
          (input.mode as string) || 'transit',
        )
        if (!result) return JSON.stringify({ error: 'ルート情報の取得に失敗しました。住所を確認するか、別の移動手段をお試しください。' })
        return JSON.stringify(result)
      }
      default:
        return JSON.stringify({ error: `未知のツール: ${name}` })
    }
  }
  catch (err) {
    console.error(`ツール実行エラー (${name}):`, err)
    return JSON.stringify({ error: 'ツールの実行中にエラーが発生しました。' })
  }
}

// --- コンテキスト構築 ---

/** しおりの既存情報（基本情報 + 日程・イベント）をプロンプト用テキストに変換 */
async function buildShioriContext(shioriId: string): Promise<string> {
  const supabase = useServerSupabase()

  const { data: shiori } = await supabase
    .from('shioris')
    .select('title, area, start_date, end_date')
    .eq('id', shioriId)
    .single()

  if (!shiori) return ''

  let context = `\n\n## 現在のしおり情報\n- タイトル: ${shiori.title}`
  if (shiori.area) context += `\n- エリア: ${shiori.area}`
  if (shiori.start_date) context += `\n- 開始日: ${shiori.start_date}`
  if (shiori.end_date) context += `\n- 終了日: ${shiori.end_date}`

  // 既存の日程を取得
  const { data: days } = await supabase
    .from('days')
    .select('id, day_number, date')
    .eq('shiori_id', shioriId)
    .order('day_number')

  if (!days?.length) return context

  // 全日程のイベントを一括取得（N+1回避）
  const dayIds = days.map(d => d.id)
  const { data: events } = await supabase
    .from('events')
    .select('day_id, title, category, start_time, end_time, address, memo, sort_order')
    .in('day_id', dayIds)
    .order('sort_order')

  // day_id でグループ化
  const eventsByDay = new Map<string, typeof events>()
  for (const ev of events ?? []) {
    const list = eventsByDay.get(ev.day_id) ?? []
    list.push(ev)
    eventsByDay.set(ev.day_id, list)
  }

  context += '\n\n### 既存の予定（しおりに登録済み）'
  for (const day of days) {
    context += `\n\n#### Day ${day.day_number}`
    if (day.date) context += ` (${day.date})`

    const dayEvents = eventsByDay.get(day.id) ?? []
    if (dayEvents.length > 0) {
      for (const ev of dayEvents) {
        const time = ev.start_time ? ev.start_time.slice(0, 5) : '??:??'
        const endTime = ev.end_time ? `〜${ev.end_time.slice(0, 5)}` : ''
        context += `\n- ${time}${endTime} ${ev.title} [${ev.category}]`
        if (ev.address) context += ` @${ev.address}`
      }
    }
    else {
      context += '\n- （イベントなし）'
    }
  }

  context += '\n\n*上記は既に登録されている予定です。新しいプランを提案する際は、既存の予定との整合性を考慮してください。ユーザーが「プランを作り直して」と言った場合は、既存の予定を置き換える新しいプランを提案してください。*'

  return context
}

// --- メインハンドラ ---

/** ツール使用ループの最大回数（無限ループ防止） */
const MAX_TOOL_ROUNDS = 10

/**
 * POST /api/chat
 * Claude API を使った AI チャット（Tool Use + Web Search + ストリーミング対応）
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

  // しおりのコンテキストを構築（基本情報 + 既存の日程・イベント）
  let contextPrompt = ''
  if (body.shioriId) {
    contextPrompt = await buildShioriContext(body.shioriId)
  }

  // 今日の日付を追加（季節のアドバイスに活用）
  const today = new Date().toISOString().slice(0, 10)
  const systemPrompt = SYSTEM_PROMPT + `\n\n## 今日の日付\n${today}` + contextPrompt

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const anthropic = new Anthropic({ apiKey: config.claudeApiKey })

    // ツール定義（カスタム + Web Search）
    const tools = [
      // Web Search（Anthropic がサーバー側で実行）
      {
        type: 'web_search_20250305' as const,
        name: 'web_search',
        max_uses: 3,
      },
      // カスタムツール（Google Maps Platform）
      ...CUSTOM_TOOLS,
    ]

    // API に送るメッセージ配列（ツール使用ループで追記される）
    const apiMessages: Array<{
      role: 'user' | 'assistant'
      content: string | Array<Record<string, unknown>>
    }> = body.messages!.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }))

    // SSE 形式でストリーミング
    setResponseHeader(event, 'Content-Type', 'text/event-stream')
    setResponseHeader(event, 'Cache-Control', 'no-cache')
    setResponseHeader(event, 'Connection', 'keep-alive')

    const encoder = new TextEncoder()
    let fullAssistantContent = ''

    const readableStream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        try {
          let totalUsage = { input_tokens: 0, output_tokens: 0 }

          // ツール使用ループ: Claude がツールを要求する限り繰り返す
          for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
            const stream = anthropic.messages.stream({
              model: 'claude-sonnet-4-6',
              max_tokens: 16384,
              system: systemPrompt,
              tools: tools as unknown[],
              messages: apiMessages as unknown[],
            } as Parameters<typeof anthropic.messages.stream>[0])

            // テキストチャンクをクライアントにストリーミング
            for await (const chunk of stream) {
              if (chunk.type === 'content_block_delta' && 'text' in chunk.delta) {
                fullAssistantContent += chunk.delta.text
                send({ type: 'text', text: chunk.delta.text })
              }
              // Web Search 実行中の通知
              if (chunk.type === 'content_block_start' && 'content_block' in chunk) {
                const block = chunk.content_block as { type: string; name?: string }
                if (block.type === 'server_tool_use') {
                  send({ type: 'tool_use', tools: [block.name ?? 'web_search'] })
                }
              }
            }

            const finalMsg = await stream.finalMessage()
            totalUsage.input_tokens += finalMsg.usage.input_tokens
            totalUsage.output_tokens += finalMsg.usage.output_tokens

            // ツール使用がなければループ終了
            if (finalMsg.stop_reason !== 'tool_use') break

            // ツール使用ブロックを抽出
            const toolUseBlocks = finalMsg.content
              .filter(b => b.type === 'tool_use')
              .map(b => b as unknown as { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> })

            if (toolUseBlocks.length === 0) break

            // クライアントにツール使用を通知
            send({ type: 'tool_use', tools: toolUseBlocks.map(t => t.name) })

            // ツールを実行して結果を収集
            const toolResults = await Promise.all(
              toolUseBlocks.map(async toolBlock => ({
                type: 'tool_result' as const,
                tool_use_id: toolBlock.id,
                content: await executeTool(toolBlock.name, toolBlock.input),
              })),
            )

            // 次のラウンド用にメッセージを追加
            apiMessages.push({
              role: 'assistant',
              content: finalMsg.content as unknown as Array<Record<string, unknown>>,
            })
            apiMessages.push({
              role: 'user',
              content: toolResults as unknown as Array<Record<string, unknown>>,
            })
          }

          send({ type: 'done' })
          send({ type: 'usage', usage: totalUsage })
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
        }
        catch (streamError) {
          console.error('ストリーミングエラー:', streamError)
          send({ type: 'error', message: 'ストリーミング中にエラーが発生しました。' })
          controller.close()
        }
      },
    })

    return sendStream(event, readableStream)
  }
  catch (error: unknown) {
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
