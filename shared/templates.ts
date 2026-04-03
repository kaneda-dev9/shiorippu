/** しおりデザインテンプレートの定義 */

export interface ShioriTemplate {
  id: string
  name: string
  description: string
  icon: string
  colors: {
    // テキスト系
    accent: string
    dayHeader: string
    link: string
    linkHover: string
    eventIconText: string
    // 背景系
    accentBg: string
    accentBgDark: string
    eventIconBg: string
    headerGradient: string   // カバー画像なし時のフォールバック
    headerBg: string
    headerBgDark: string
    // イベントカード
    cardBorderHover: string
    cardLeftBorder: string
    // バッジ
    badgeText: string
    badgeBg: string
    // 追加ボタン
    addBtnBorderHover: string
    addBtnTextHover: string
    addBtnBorderHoverDark: string
    // ドラッグハンドル
    dragHandleHover: string
  }
  previewGradient: string
}

/** 統一スタイル: すべてのしおりで同じ洗練されたデザインを使用 */
const unifiedColors: ShioriTemplate['colors'] = {
  accent: 'text-stone-700 dark:text-stone-300',
  dayHeader: 'text-stone-700 dark:text-stone-300',
  link: 'text-amber-700 dark:text-amber-400',
  linkHover: 'hover:text-amber-800 dark:hover:text-amber-300',
  eventIconText: 'text-stone-500 dark:text-stone-400',
  accentBg: 'bg-stone-100',
  accentBgDark: 'dark:bg-stone-800',
  eventIconBg: 'bg-stone-100 dark:bg-stone-800',
  headerGradient: 'from-stone-400 to-stone-500',
  headerBg: 'bg-stone-50',
  headerBgDark: 'dark:bg-stone-900/50',
  cardBorderHover: 'hover:border-stone-300 dark:hover:border-stone-600',
  cardLeftBorder: '',
  badgeText: 'text-stone-600 dark:text-stone-300',
  badgeBg: 'bg-stone-100 dark:bg-stone-800',
  addBtnBorderHover: 'hover:border-stone-400',
  addBtnTextHover: 'hover:text-stone-600',
  addBtnBorderHoverDark: 'dark:hover:border-stone-500',
  dragHandleHover: 'hover:text-stone-500',
}

export const templates: Record<string, ShioriTemplate> = {
  simple: {
    id: 'simple',
    name: 'シンプル',
    description: 'ミニマルで洗練されたデザイン',
    icon: 'i-lucide-minus',
    colors: unifiedColors,
    previewGradient: 'from-stone-300 to-stone-500',
  },
  pop: {
    id: 'pop',
    name: 'ポップ',
    description: '明るく楽しい旅行向け',
    icon: 'i-lucide-party-popper',
    colors: unifiedColors,
    previewGradient: 'from-stone-300 to-stone-500',
  },
  wafuu: {
    id: 'wafuu',
    name: '和風',
    description: '京都・温泉など和の旅に',
    icon: 'i-lucide-fan',
    colors: unifiedColors,
    previewGradient: 'from-stone-300 to-stone-500',
  },
  resort: {
    id: 'resort',
    name: 'リゾート',
    description: '海・南国リゾートの旅に',
    icon: 'i-lucide-palm-tree',
    colors: unifiedColors,
    previewGradient: 'from-stone-300 to-stone-500',
  },
  nature: {
    id: 'nature',
    name: 'ナチュラル',
    description: 'キャンプ・自然の旅に',
    icon: 'i-lucide-trees',
    colors: unifiedColors,
    previewGradient: 'from-stone-300 to-stone-500',
  },
}

/** テンプレートIDからテンプレートを取得（デフォルト: simple） */
export function getTemplate(id: string | null | undefined): ShioriTemplate {
  return templates[id || 'simple'] || templates.simple!
}

/** テンプレート一覧を配列で取得 */
export function getTemplateList(): ShioriTemplate[] {
  return Object.values(templates)
}
