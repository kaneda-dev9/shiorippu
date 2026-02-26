/** テンプレート → HEXカラーパレット（PDF出力用） */

export interface PdfColorPalette {
  accent: string           // メインアクセント色
  accentLight: string      // 薄いアクセント色（カード背景等）
  gradientStart: string    // ヘッダーグラデーション開始
  gradientEnd: string      // ヘッダーグラデーション終了
  cardBorder: string       // カード左ボーダー色
  badgeText: string        // バッジテキスト色
  badgeBg: string          // バッジ背景色
  dayHeaderText: string    // Day見出しテキスト色
}

/** テンプレートIDからPDFカラーパレットを取得 */
const palettes: Record<string, PdfColorPalette> = {
  simple: {
    accent: '#57534e',       // stone-600
    accentLight: '#f5f5f4',  // stone-100
    gradientStart: '#a8a29e', // stone-400
    gradientEnd: '#78716c',  // stone-500
    cardBorder: '#d6d3d1',   // stone-300
    badgeText: '#57534e',    // stone-600
    badgeBg: '#f5f5f4',      // stone-100
    dayHeaderText: '#57534e', // stone-600
  },
  pop: {
    accent: '#f97316',       // orange-500
    accentLight: '#fff7ed',  // orange-50
    gradientStart: '#fb923c', // orange-400
    gradientEnd: '#facc15',  // yellow-400
    cardBorder: '#fb923c',   // orange-400
    badgeText: '#ea580c',    // orange-600
    badgeBg: '#fff7ed',      // orange-50
    dayHeaderText: '#f97316', // orange-500
  },
  wafuu: {
    accent: '#b45309',       // amber-700
    accentLight: '#fffbeb',  // amber-50
    gradientStart: '#d97706', // amber-600
    gradientEnd: '#ca8a04',  // yellow-600
    cardBorder: '#f59e0b',   // amber-500
    badgeText: '#b45309',    // amber-700
    badgeBg: '#fffbeb',      // amber-50
    dayHeaderText: '#b45309', // amber-700
  },
  resort: {
    accent: '#06b6d4',       // cyan-500
    accentLight: '#ecfeff',  // cyan-50
    gradientStart: '#22d3ee', // cyan-400
    gradientEnd: '#60a5fa',  // blue-400
    cardBorder: '#22d3ee',   // cyan-400
    badgeText: '#0891b2',    // cyan-600
    badgeBg: '#ecfeff',      // cyan-50
    dayHeaderText: '#06b6d4', // cyan-500
  },
  nature: {
    accent: '#16a34a',       // green-600
    accentLight: '#f0fdf4',  // green-50
    gradientStart: '#22c55e', // green-500
    gradientEnd: '#a3e635',  // lime-400
    cardBorder: '#22c55e',   // green-500
    badgeText: '#16a34a',    // green-600
    badgeBg: '#f0fdf4',      // green-50
    dayHeaderText: '#16a34a', // green-600
  },
}

/** テンプレートIDからパレットを取得（デフォルト: simple） */
export function getPdfPalette(templateId: string | null | undefined): PdfColorPalette {
  return palettes[templateId || 'simple'] || palettes.simple!
}
