/**
 * PDF出力コアレンダラー
 * jsPDF を使ってしおりデータからA4 PDFを構築する
 */
import type { jsPDF } from 'jspdf'
import type { ShioriWithDays, DayWithEvents, Event } from '~~/types/database'
import { categoryLabels } from '~~/shared/category-icons'
import type { EventCategory } from '~~/types/database'
import { getCategoryEmoji } from './icons'
import { getPdfPalette, type PdfColorPalette } from './colors'
import {
  PAGE_WIDTH, PAGE_HEIGHT,
  MARGIN_TOP, MARGIN_LEFT, MARGIN_RIGHT,
  CONTENT_WIDTH, PAGE_BOTTOM,
  FONT_TITLE, FONT_SUBTITLE, FONT_DAY_HEADER,
  FONT_EVENT_TITLE, FONT_EVENT_META, FONT_FOOTER,
  GRADIENT_BAR_HEIGHT, HEADER_PADDING_TOP,
  HEADER_TITLE_BOTTOM, HEADER_META_BOTTOM,
  HEADER_BOTTOM_MARGIN, DAY_HEADER_HEIGHT,
  DAY_HEADER_MARGIN_BOTTOM, EVENT_CARD_PADDING,
  EVENT_CARD_GAP, EVENT_CARD_BORDER_LEFT,
  FOOTER_Y, FONT_FAMILY,
} from './layout'

// ========================================
// ユーティリティ
// ========================================

/** HEXカラーを [r, g, b] に変換 */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ]
}

/** 2色間を線形補間 */
function lerpColor(c1: [number, number, number], c2: [number, number, number], t: number): [number, number, number] {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ]
}

/** 時刻文字列を "HH:MM" にフォーマット */
function fmtTime(time: string | null): string {
  if (!time) return ''
  return time.slice(0, 5)
}

/** 日付文字列を「YYYY年M月D日」にフォーマット */
function fmtDateJa(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

/** 日付範囲を「M/D - M/D」にフォーマット */
function fmtDateRange(start: string | null, end: string | null): string {
  if (!start) return ''
  const s = new Date(start)
  const startStr = `${s.getMonth() + 1}/${s.getDate()}`
  if (!end) return startStr
  const e = new Date(end)
  return `${startStr} - ${e.getMonth() + 1}/${e.getDate()}`
}

// ========================================
// フォント読み込み
// ========================================

/** 日本語フォントを読み込んでjsPDFに登録 */
async function loadJapaneseFont(doc: jsPDF): Promise<void> {
  // Regular フォントを fetch
  const regularRes = await fetch('/fonts/NotoSansJP-Regular.ttf')
  const regularBuf = await regularRes.arrayBuffer()
  const regularBase64 = arrayBufferToBase64(regularBuf)

  // フォント登録（normal + bold で同じフォントデータを使用）
  doc.addFileToVFS('NotoSansJP-Regular.ttf', regularBase64)
  doc.addFont('NotoSansJP-Regular.ttf', FONT_FAMILY, 'normal')

  // Bold も同じフォントデータで登録（Variable font のため）
  doc.addFileToVFS('NotoSansJP-Bold.ttf', regularBase64)
  doc.addFont('NotoSansJP-Bold.ttf', FONT_FAMILY, 'bold')

  doc.setFont(FONT_FAMILY, 'normal')
}

/** ArrayBuffer を Base64 文字列に変換 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}

// ========================================
// 描画関数
// ========================================

/** ヘッダーのグラデーションバーを描画 */
function drawGradientBar(doc: jsPDF, palette: PdfColorPalette, y: number): number {
  const steps = 60
  const stepWidth = CONTENT_WIDTH / steps
  const c1 = hexToRgb(palette.gradientStart)
  const c2 = hexToRgb(palette.gradientEnd)

  for (let i = 0; i < steps; i++) {
    const color = lerpColor(c1, c2, i / (steps - 1))
    doc.setFillColor(color[0], color[1], color[2])
    // 端を丸くするため最初と最後のステップだけ微調整
    const x = MARGIN_LEFT + i * stepWidth
    doc.rect(x, y, stepWidth + 0.1, GRADIENT_BAR_HEIGHT, 'F')
  }

  return y + GRADIENT_BAR_HEIGHT
}

/** ヘッダー（タイトル・エリア・日程）を描画 */
function drawHeader(doc: jsPDF, shiori: ShioriWithDays, palette: PdfColorPalette, y: number): number {
  y += HEADER_PADDING_TOP

  // タイトル
  doc.setFont(FONT_FAMILY, 'bold')
  doc.setFontSize(FONT_TITLE)
  doc.setTextColor(41, 37, 36) // stone-900
  const titleLines = doc.splitTextToSize(shiori.title, CONTENT_WIDTH - 20)
  const titleX = PAGE_WIDTH / 2
  doc.text(titleLines, titleX, y, { align: 'center' })
  y += titleLines.length * (FONT_TITLE * 0.4) + HEADER_TITLE_BOTTOM

  // エリア
  if (shiori.area) {
    doc.setFont(FONT_FAMILY, 'normal')
    doc.setFontSize(FONT_SUBTITLE)
    doc.setTextColor(120, 113, 108) // stone-500
    doc.text(`📍 ${shiori.area}`, titleX, y, { align: 'center' })
    y += FONT_SUBTITLE * 0.4 + HEADER_META_BOTTOM
  }

  // 日付範囲
  if (shiori.start_date) {
    doc.setFont(FONT_FAMILY, 'normal')
    doc.setFontSize(FONT_SUBTITLE)
    doc.setTextColor(120, 113, 108)
    const dateText = shiori.end_date
      ? `📅 ${fmtDateRange(shiori.start_date, shiori.end_date)}`
      : `📅 ${fmtDateJa(shiori.start_date)}`
    doc.text(dateText, titleX, y, { align: 'center' })
    y += FONT_SUBTITLE * 0.4 + HEADER_META_BOTTOM
  }

  y += HEADER_BOTTOM_MARGIN
  return y
}

/** Day ヘッダーを描画 */
function drawDayHeader(doc: jsPDF, day: DayWithEvents, palette: PdfColorPalette, y: number): number {
  const rgb = hexToRgb(palette.dayHeaderText)
  doc.setFont(FONT_FAMILY, 'bold')
  doc.setFontSize(FONT_DAY_HEADER)
  doc.setTextColor(rgb[0], rgb[1], rgb[2])

  // 左の線
  doc.setDrawColor(rgb[0], rgb[1], rgb[2])
  doc.setLineWidth(0.5)
  doc.line(MARGIN_LEFT, y - 1.5, MARGIN_LEFT + 20, y - 1.5)

  const label = `Day ${day.day_number}`
  doc.text(label, MARGIN_LEFT + 23, y)

  // 日付
  if (day.date) {
    const labelWidth = doc.getTextWidth(label)
    doc.setFont(FONT_FAMILY, 'normal')
    doc.setFontSize(FONT_EVENT_META)
    doc.setTextColor(168, 162, 158) // stone-400
    doc.text(fmtDateJa(day.date), MARGIN_LEFT + 23 + labelWidth + 3, y)
  }

  // 右の線
  const rightLineStart = MARGIN_LEFT + 23 + doc.getTextWidth(label) + (day.date ? doc.getTextWidth(fmtDateJa(day.date)) + 6 : 3)
  const rightLineEnd = PAGE_WIDTH - MARGIN_RIGHT
  if (rightLineStart < rightLineEnd - 5) {
    doc.setDrawColor(rgb[0], rgb[1], rgb[2])
    doc.setLineWidth(0.3)
    doc.line(rightLineStart, y - 1.5, rightLineEnd, y - 1.5)
  }

  return y + DAY_HEADER_MARGIN_BOTTOM
}

/** イベントカードの高さを事前計算 */
function measureEventCard(doc: jsPDF, event: Event): number {
  let height = EVENT_CARD_PADDING * 2 // 上下パディング

  // 1行目: 時間 + バッジ
  height += FONT_EVENT_META * 0.4 + 1

  // 2行目: タイトル（複数行の可能性）
  doc.setFontSize(FONT_EVENT_TITLE)
  const titleLines = doc.splitTextToSize(event.title, CONTENT_WIDTH - 15)
  height += titleLines.length * (FONT_EVENT_TITLE * 0.4) + 1

  // 住所
  if (event.address) {
    height += FONT_EVENT_META * 0.4 + 1
  }

  // メモ（複数行の可能性）
  if (event.memo) {
    doc.setFontSize(FONT_EVENT_META)
    const memoLines = doc.splitTextToSize(event.memo, CONTENT_WIDTH - 15)
    height += memoLines.length * (FONT_EVENT_META * 0.4) + 1
  }

  return Math.max(height, 12) // 最低高さ 12mm
}

/** イベントカード1件を描画 */
function drawEventCard(
  doc: jsPDF,
  event: Event,
  palette: PdfColorPalette,
  y: number,
): number {
  const cardHeight = measureEventCard(doc, event)
  const cardX = MARGIN_LEFT
  const cardInnerX = cardX + EVENT_CARD_BORDER_LEFT + EVENT_CARD_PADDING + 1

  // カード背景（薄い灰色）
  doc.setFillColor(250, 250, 249) // stone-50
  doc.roundedRect(cardX, y, CONTENT_WIDTH, cardHeight, 1.5, 1.5, 'F')

  // カード左ボーダー
  const borderRgb = hexToRgb(palette.cardBorder)
  doc.setFillColor(borderRgb[0], borderRgb[1], borderRgb[2])
  doc.rect(cardX, y + 1, EVENT_CARD_BORDER_LEFT, cardHeight - 2, 'F')

  let textY = y + EVENT_CARD_PADDING + FONT_EVENT_META * 0.35

  // カテゴリ絵文字 + 時間 + バッジ
  doc.setFont(FONT_FAMILY, 'normal')
  doc.setFontSize(FONT_EVENT_META)

  // 絵文字
  const emoji = getCategoryEmoji(event.category)
  let lineX = cardInnerX
  doc.setTextColor(0, 0, 0)
  doc.text(emoji, lineX, textY)
  lineX += doc.getTextWidth(emoji) + 1.5

  // 時間
  if (event.start_time) {
    doc.setTextColor(168, 162, 158) // stone-400
    const timeText = event.end_time
      ? `${fmtTime(event.start_time)} - ${fmtTime(event.end_time)}`
      : fmtTime(event.start_time)
    doc.text(timeText, lineX, textY)
    lineX += doc.getTextWidth(timeText) + 2
  }

  // カテゴリバッジ
  const label = categoryLabels[event.category as EventCategory] || 'その他'
  const badgeBgRgb = hexToRgb(palette.badgeBg)
  const badgeTextRgb = hexToRgb(palette.badgeText)
  doc.setFontSize(6.5)
  const badgeWidth = doc.getTextWidth(label) + 3
  doc.setFillColor(badgeBgRgb[0], badgeBgRgb[1], badgeBgRgb[2])
  doc.roundedRect(lineX, textY - 2.2, badgeWidth, 3.2, 0.8, 0.8, 'F')
  doc.setTextColor(badgeTextRgb[0], badgeTextRgb[1], badgeTextRgb[2])
  doc.text(label, lineX + 1.5, textY)

  textY += FONT_EVENT_META * 0.4 + 1

  // タイトル
  doc.setFont(FONT_FAMILY, 'bold')
  doc.setFontSize(FONT_EVENT_TITLE)
  doc.setTextColor(41, 37, 36) // stone-900
  const titleLines = doc.splitTextToSize(event.title, CONTENT_WIDTH - 15)
  doc.text(titleLines, cardInnerX, textY)
  textY += titleLines.length * (FONT_EVENT_TITLE * 0.4) + 1

  // 住所
  if (event.address) {
    doc.setFont(FONT_FAMILY, 'normal')
    doc.setFontSize(FONT_EVENT_META)
    doc.setTextColor(168, 162, 158)
    doc.text(`📍 ${event.address}`, cardInnerX, textY)
    textY += FONT_EVENT_META * 0.4 + 1
  }

  // メモ
  if (event.memo) {
    doc.setFont(FONT_FAMILY, 'normal')
    doc.setFontSize(FONT_EVENT_META)
    doc.setTextColor(120, 113, 108) // stone-500
    const memoLines = doc.splitTextToSize(event.memo, CONTENT_WIDTH - 15)
    doc.text(memoLines, cardInnerX, textY)
  }

  return y + cardHeight
}

/** フッター（ページ番号 + ブランディング）を描画 */
function drawFooter(doc: jsPDF, pageNum: number, totalPages: number): void {
  doc.setFont(FONT_FAMILY, 'normal')
  doc.setFontSize(FONT_FOOTER)
  doc.setTextColor(168, 162, 158) // stone-400

  // ページ番号
  doc.text(
    `${pageNum} / ${totalPages}`,
    PAGE_WIDTH / 2,
    FOOTER_Y,
    { align: 'center' },
  )

  // ブランディング
  doc.text(
    'しおりっぷで作成',
    PAGE_WIDTH / 2,
    FOOTER_Y + 4,
    { align: 'center' },
  )
}

// ========================================
// ページ分割管理
// ========================================

interface PageState {
  doc: jsPDF
  currentY: number
  palette: PdfColorPalette
  pageCount: number
}

/** ページ溢れチェック → 必要なら改ページ */
function checkPageBreak(state: PageState, neededHeight: number): void {
  if (state.currentY + neededHeight > PAGE_BOTTOM) {
    state.doc.addPage()
    state.pageCount++
    state.currentY = MARGIN_TOP

    // 新ページのグラデーションバー
    state.currentY = drawGradientBar(state.doc, state.palette, state.currentY)
    state.currentY += 3
  }
}

// ========================================
// メインAPI
// ========================================

/** しおりデータからPDFを生成 */
export async function generateShioriPdf(shiori: ShioriWithDays): Promise<jsPDF> {
  // jsPDF を動的インポート
  const { jsPDF: JsPDF } = await import('jspdf')
  const doc = new JsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  // 日本語フォント読み込み
  await loadJapaneseFont(doc)

  const palette = getPdfPalette(shiori.template_id)
  const state: PageState = {
    doc,
    currentY: MARGIN_TOP,
    palette,
    pageCount: 1,
  }

  // ヘッダーグラデーションバー
  state.currentY = drawGradientBar(doc, palette, state.currentY)

  // タイトル・メタ情報
  state.currentY = drawHeader(doc, shiori, palette, state.currentY)

  // 日程・イベントの描画
  const sortedDays = [...shiori.days].sort((a, b) => a.sort_order - b.sort_order)

  for (let dayIdx = 0; dayIdx < sortedDays.length; dayIdx++) {
    const day = sortedDays[dayIdx]!
    const sortedEvents = [...day.events].sort((a, b) => a.sort_order - b.sort_order)

    // Day見出しの高さ + 最低1イベント分の高さを確保
    const dayHeaderNeeded = DAY_HEADER_HEIGHT + DAY_HEADER_MARGIN_BOTTOM
    const firstEventHeight = sortedEvents.length > 0 ? measureEventCard(doc, sortedEvents[0]!) : 0
    checkPageBreak(state, dayHeaderNeeded + firstEventHeight)

    // Day見出し
    state.currentY = drawDayHeader(doc, day, palette, state.currentY)

    // イベント描画
    if (sortedEvents.length === 0) {
      // イベントなしメッセージ
      doc.setFont(FONT_FAMILY, 'normal')
      doc.setFontSize(FONT_EVENT_META)
      doc.setTextColor(168, 162, 158)
      doc.text('この日の予定はありません', MARGIN_LEFT + 5, state.currentY)
      state.currentY += 8
    }
    else {
      for (const event of sortedEvents) {
        const eventHeight = measureEventCard(doc, event)
        checkPageBreak(state, eventHeight + EVENT_CARD_GAP)
        state.currentY = drawEventCard(doc, event, palette, state.currentY)
        state.currentY += EVENT_CARD_GAP
      }
    }

    // Day間のスペース
    if (dayIdx < sortedDays.length - 1) {
      state.currentY += 4
    }
  }

  // 空のしおり
  if (sortedDays.length === 0) {
    doc.setFont(FONT_FAMILY, 'normal')
    doc.setFontSize(FONT_SUBTITLE)
    doc.setTextColor(168, 162, 158)
    doc.text('まだ予定が登録されていません', PAGE_WIDTH / 2, state.currentY + 20, { align: 'center' })
  }

  // 全ページにフッターを描画
  const totalPages = state.pageCount
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    drawFooter(doc, i, totalPages)
  }

  return doc
}
