import { marked } from 'marked'
import DOMPurify from 'dompurify'
import type { UIMessage } from 'ai'
import { isTextUIPart } from 'ai'
import type { TripPlan } from '~~/types/database'

marked.setOptions({ breaks: true, gfm: true })

// ===========================================
// 型定義
// ===========================================

export interface ChoiceCard {
  emoji: string
  label: string
  description: string
}

// ===========================================
// 定数
// ===========================================

/** ツール名→表示設定のマッピング */
export const TOOL_CONFIG: Record<string, { label: string; icon: string }> = {
  search_places: { label: 'スポットを検索中', icon: 'i-lucide-map-pin' },
  get_place_details: { label: 'スポットの詳細を取得中', icon: 'i-lucide-info' },
  get_directions: { label: '移動時間を計算中', icon: 'i-lucide-route' },
  web_search: { label: '最新情報を検索中', icon: 'i-lucide-search' },
}

// ===========================================
// Markdown
// ===========================================

/** Markdownレンダリングキャッシュ */
const mdCache = new Map<string, string>()
const MD_CACHE_MAX = 200

/** マークダウンをHTMLに変換（サニタイズ済み、キャッシュ付き） */
export function renderMd(text: string): string {
  if (!text) return ''

  const cached = mdCache.get(text)
  if (cached) return cached

  const html = marked.parse(text, { async: false }) as string
  const sanitized = DOMPurify.sanitize(html)

  // キャッシュサイズ制限
  if (mdCache.size >= MD_CACHE_MAX) {
    const firstKey = mdCache.keys().next().value
    if (firstKey !== undefined) mdCache.delete(firstKey)
  }
  mdCache.set(text, sanitized)

  return sanitized
}

// ===========================================
// プラン関連
// ===========================================

/** メッセージからPLAN_JSONを抽出 */
export function extractPlan(content: string): TripPlan | null {
  const match = content.match(/<PLAN_JSON>([\s\S]*?)<\/PLAN_JSON>/)
  if (!match?.[1]) return null
  try {
    const parsed = JSON.parse(match[1])
    if (parsed?.days?.length > 0) return parsed as TripPlan
  }
  catch {
    // JSONパース失敗
  }
  return null
}

/** ストリーミング中にプランJSON生成中かどうかを判定 */
export function isPlanStreaming(content: string): boolean {
  return content.includes('<PLAN_JSON>') && !content.includes('</PLAN_JSON>')
}

/** ストリーミング中の不完全JSONからイベント数をカウント */
export function countStreamingEvents(content: string): number {
  const planStart = content.indexOf('<PLAN_JSON>')
  if (planStart === -1) return 0
  const partial = content.slice(planStart)
  return (partial.match(/"title"\s*:/g) || []).length
}

/** メッセージからPLAN_JSONタグを除去したテキストを返す */
export function getTextWithoutPlan(content: string): string {
  // 完全なタグを除去
  let text = content.replace(/<PLAN_JSON>[\s\S]*?<\/PLAN_JSON>/, '')
  // 未完了の開きタグ以降を除去（ストリーミング中）
  text = text.replace(/<PLAN_JSON>[\s\S]*$/, '')
  // 閉じタグから始まるパーツを除去（パーツ跨ぎ対応）
  text = text.replace(/^[\s\S]*?<\/PLAN_JSON>/, '')
  return text.trim()
}

// ===========================================
// 選択肢関連
// ===========================================

/**
 * AIメッセージの本文部分（選択肢リストを除外）を取得
 * 「1. 」で始まる番号付きリスト以降を除去して本文のみ返す
 */
export function getMessageBody(content: string): string {
  const lines = content.split('\n')
  const bodyLines: string[] = []
  for (const line of lines) {
    if (/^\s*1\.\s/.test(line)) break
    bodyLines.push(line)
  }
  // 末尾の空行を除去
  while (bodyLines.length > 0 && (bodyLines[bodyLines.length - 1] || '').trim() === '') {
    bodyLines.pop()
  }
  return bodyLines.join('\n')
}

/**
 * AIの回答から選択肢カードを抽出する
 */
export function parseChoiceCards(content: string): ChoiceCard[] {
  const choices: ChoiceCard[] = []
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] || '').trim()

    // 番号付きリストの行を検出
    const numberedMatch = line.match(/^\d+\.\s+(.+)$/)
    if (!numberedMatch?.[1]) continue

    const restOfLine = numberedMatch[1]

    // ラベルを抽出
    let label = ''
    const boldMatch = restOfLine.match(/\*\*(.+?)\*\*/)
    if (boldMatch?.[1]) {
      label = boldMatch[1].trim()
    }
    else {
      const plainLabel = restOfLine.replace(/[（(].+?[）)]/, '').trim()
      label = plainLabel.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim()
    }

    if (!label || label.length > 25) continue

    // 絵文字を抽出
    const emojiMatch = restOfLine.match(/([\p{Emoji_Presentation}\p{Extended_Pictographic}])/u)
    const emoji = emojiMatch?.[1] ?? ''

    // 説明文を抽出
    let description = ''

    // 同じ行の括弧内
    const parenMatch = restOfLine.match(/[（(](.+?)[）)]/)
    if (parenMatch?.[1]) {
      description = parenMatch[1]
    }
    else {
      // 後続の行から説明を収集
      for (let j = i + 1; j < lines.length && j <= i + 3; j++) {
        const nextLine = (lines[j] || '').trim()
        if (!nextLine) continue
        if (/^\d+\.\s/.test(nextLine)) break

        const nextParen = nextLine.match(/^[（(](.+?)[）)]$/)
        if (nextParen?.[1]) {
          description = nextParen[1]
          break
        }
        if (/^[-•・→]\s*/.test(nextLine)) {
          description = nextLine.replace(/^[-•・→]\s*/, '')
          break
        }
      }
    }

    choices.push({ emoji, label, description })
  }

  return choices
}

/** 単一選択モードかどうか */
export function isSingleSelectMessage(content: string): boolean {
  return /1つ選/.test(content)
}

// ===========================================
// UIMessage ユーティリティ
// ===========================================

/** UIMessage からテキスト全文を取得 */
export function getFullText(message: UIMessage): string {
  return message.parts
    .filter(isTextUIPart)
    .map(p => p.text)
    .join('')
}

/** 確認メッセージ（「〜しましょうか？」等）に対するクイックリプライを抽出 */
export function getQuickReplies(content: string): string[] {
  // 「作成しましょうか」「よろしいですか」「進めましょうか」等の確認パターン
  if (/作成しましょうか|よろしいですか|進めましょうか|始めましょうか|いかがですか/.test(content)) {
    return ['はい、お願いします']
  }
  return []
}
