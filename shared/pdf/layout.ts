/** PDF出力のA4レイアウト定数 */

// A4寸法 (mm)
export const PAGE_WIDTH = 210
export const PAGE_HEIGHT = 297

// マージン (mm)
export const MARGIN_TOP = 15
export const MARGIN_BOTTOM = 20 // ページ番号用スペース
export const MARGIN_LEFT = 15
export const MARGIN_RIGHT = 15

// コンテンツ領域
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT // 180mm
export const CONTENT_HEIGHT = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM // 262mm
export const PAGE_BOTTOM = PAGE_HEIGHT - MARGIN_BOTTOM

// フォントサイズ (pt)
export const FONT_TITLE = 18
export const FONT_SUBTITLE = 10
export const FONT_DAY_HEADER = 13
export const FONT_EVENT_TITLE = 10
export const FONT_EVENT_META = 8
export const FONT_FOOTER = 7

// 間隔 (mm)
export const GRADIENT_BAR_HEIGHT = 3
export const HEADER_PADDING_TOP = 8
export const HEADER_TITLE_BOTTOM = 3
export const HEADER_META_BOTTOM = 2
export const HEADER_BOTTOM_MARGIN = 8
export const DAY_HEADER_HEIGHT = 8
export const DAY_HEADER_MARGIN_BOTTOM = 4
export const EVENT_CARD_PADDING = 3
export const EVENT_CARD_GAP = 3
export const EVENT_CARD_BORDER_LEFT = 1
export const EVENT_CARD_RADIUS = 2
export const FOOTER_Y = PAGE_HEIGHT - 10

// フォント名
export const FONT_FAMILY = 'NotoSansJP'
