import { describe, expect, it } from 'vitest'
import {
  renderMd,
  extractPlan,
  isPlanStreaming,
  countStreamingEvents,
  getTextWithoutPlan,
  getMessageBody,
  parseChoiceCards,
  isSingleSelectMessage,
  getQuickReplies,
} from '~~/app/utils/chatHelpers'

// ===========================================
// renderMd
// ===========================================

describe('renderMd', () => {
  it('マークダウンをHTMLに変換する', () => {
    const result = renderMd('**太字**')
    expect(result).toContain('<strong>太字</strong>')
  })

  it('XSSをサニタイズする', () => {
    const result = renderMd('<script>alert("xss")</script>')
    expect(result).not.toContain('<script>')
  })

  it('空文字列は空文字列を返す', () => {
    expect(renderMd('')).toBe('')
  })
})

// ===========================================
// extractPlan
// ===========================================

describe('extractPlan', () => {
  it('有効なPLAN_JSONを抽出する', () => {
    const content = 'テキスト<PLAN_JSON>{"days":[{"events":[]}]}</PLAN_JSON>後続テキスト'
    const plan = extractPlan(content)
    expect(plan).not.toBeNull()
    expect(plan!.days).toHaveLength(1)
  })

  it('PLAN_JSONタグがない場合nullを返す', () => {
    expect(extractPlan('普通のテキスト')).toBeNull()
  })

  it('不正なJSONの場合nullを返す', () => {
    expect(extractPlan('<PLAN_JSON>{invalid}</PLAN_JSON>')).toBeNull()
  })

  it('daysが空配列の場合nullを返す', () => {
    expect(extractPlan('<PLAN_JSON>{"days":[]}</PLAN_JSON>')).toBeNull()
  })

  it('daysプロパティがない場合nullを返す', () => {
    expect(extractPlan('<PLAN_JSON>{"other":"value"}</PLAN_JSON>')).toBeNull()
  })
})

// ===========================================
// isPlanStreaming / countStreamingEvents
// ===========================================

describe('isPlanStreaming', () => {
  it('開始タグのみの場合trueを返す', () => {
    expect(isPlanStreaming('テキスト<PLAN_JSON>{"days":[...')).toBe(true)
  })

  it('両タグがある場合falseを返す', () => {
    expect(isPlanStreaming('<PLAN_JSON>{"days":[]}</PLAN_JSON>')).toBe(false)
  })

  it('タグなしの場合falseを返す', () => {
    expect(isPlanStreaming('普通のテキスト')).toBe(false)
  })
})

describe('countStreamingEvents', () => {
  it('ストリーミング中のイベント数をカウントする', () => {
    const content = '<PLAN_JSON>{"days":[{"events":[{"title":"イベント1"},{"title":"イベント2"'
    expect(countStreamingEvents(content)).toBe(2)
  })

  it('PLAN_JSONタグがない場合0を返す', () => {
    expect(countStreamingEvents('テキスト')).toBe(0)
  })

  it('titleがない場合0を返す', () => {
    expect(countStreamingEvents('<PLAN_JSON>{"days":[')).toBe(0)
  })
})

// ===========================================
// getTextWithoutPlan / getMessageBody
// ===========================================

describe('getTextWithoutPlan', () => {
  it('完全なPLAN_JSONタグを除去する', () => {
    const result = getTextWithoutPlan('前テキスト<PLAN_JSON>{"days":[]}</PLAN_JSON>後テキスト')
    expect(result).toBe('前テキスト後テキスト')
  })

  it('未完了のPLAN_JSONを除去する（ストリーミング中）', () => {
    const result = getTextWithoutPlan('前テキスト<PLAN_JSON>{"days":[...')
    expect(result).toBe('前テキスト')
  })

  it('PLAN_JSONがなければそのまま返す', () => {
    expect(getTextWithoutPlan('普通のテキスト')).toBe('普通のテキスト')
  })
})

describe('getMessageBody', () => {
  it('番号付きリスト以前の本文を返す', () => {
    const content = '旅行先を選んでください\n\n1. 東京\n2. 大阪\n3. 京都'
    expect(getMessageBody(content)).toBe('旅行先を選んでください')
  })

  it('番号付きリストがない場合全文を返す', () => {
    expect(getMessageBody('普通のテキスト')).toBe('普通のテキスト')
  })

  it('末尾の空行を除去する', () => {
    const content = '本文\n\n\n1. 選択肢'
    expect(getMessageBody(content)).toBe('本文')
  })
})

// ===========================================
// parseChoiceCards / isSingleSelectMessage
// ===========================================

describe('parseChoiceCards', () => {
  it('太字ラベルの選択肢を抽出する', () => {
    const content = '1. 🏯 **京都** （寺社巡り）\n2. 🏖 **沖縄** （ビーチ）'
    const cards = parseChoiceCards(content)
    expect(cards).toHaveLength(2)
    expect(cards[0]).toEqual({ emoji: '🏯', label: '京都', description: '寺社巡り' })
    expect(cards[1]).toEqual({ emoji: '🏖', label: '沖縄', description: 'ビーチ' })
  })

  it('太字なしの選択肢を抽出する', () => {
    const content = '1. 🚃 東京駅（集合場所）\n2. 🚃 品川駅（別ルート）'
    const cards = parseChoiceCards(content)
    expect(cards).toHaveLength(2)
    expect(cards[0]!.label).toBe('東京駅')
  })

  it('後続行の説明を収集する', () => {
    const content = '1. **京都**\n  - 寺社と紅葉の旅\n2. **大阪**\n  - グルメの旅'
    const cards = parseChoiceCards(content)
    expect(cards[0]!.description).toBe('寺社と紅葉の旅')
  })

  it('25文字超のラベルはスキップする', () => {
    const content = '1. **とても長いラベルがここに入りますが二十五文字を超えているのでスキップされます**'
    const cards = parseChoiceCards(content)
    expect(cards).toHaveLength(0)
  })

  it('空のコンテンツは空配列を返す', () => {
    expect(parseChoiceCards('')).toHaveLength(0)
  })

  it('番号付きリストでないテキストは空配列を返す', () => {
    expect(parseChoiceCards('普通のテキストです')).toHaveLength(0)
  })
})

describe('isSingleSelectMessage', () => {
  it('「1つ選」を含む場合trueを返す', () => {
    expect(isSingleSelectMessage('以下から1つ選んでください')).toBe(true)
  })

  it('含まない場合falseを返す', () => {
    expect(isSingleSelectMessage('旅行プランを提案します')).toBe(false)
  })
})

// ===========================================
// getQuickReplies
// ===========================================

describe('getQuickReplies', () => {
  it('確認メッセージに対してクイックリプライを返す', () => {
    expect(getQuickReplies('プランを作成しましょうか？')).toEqual(['はい、お願いします'])
    expect(getQuickReplies('この内容でよろしいですか？')).toEqual(['はい、お願いします'])
  })

  it('確認パターンがない場合空配列を返す', () => {
    expect(getQuickReplies('東京のおすすめスポットです')).toEqual([])
  })
})
