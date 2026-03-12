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

export const templates: Record<string, ShioriTemplate> = {
  simple: {
    id: 'simple',
    name: 'シンプル',
    description: 'ミニマルで洗練されたデザイン',
    icon: 'i-lucide-minus',
    colors: {
      accent: 'text-stone-600 dark:text-stone-300',
      dayHeader: 'text-stone-600 dark:text-stone-300',
      link: 'text-stone-600 dark:text-stone-300',
      linkHover: 'hover:text-stone-800 dark:hover:text-stone-100',
      eventIconText: 'text-stone-500 dark:text-stone-400',
      accentBg: 'bg-stone-100',
      accentBgDark: 'dark:bg-stone-800',
      eventIconBg: 'bg-stone-100 dark:bg-stone-800',
      headerGradient: 'from-stone-400 to-stone-500',
      headerBg: 'bg-stone-50',
      headerBgDark: 'dark:bg-stone-900/50',
      cardBorderHover: 'hover:border-stone-300 dark:hover:border-stone-600',
      cardLeftBorder: 'border-l-stone-300 dark:border-l-stone-600',
      badgeText: 'text-stone-600 dark:text-stone-300',
      badgeBg: 'bg-stone-100 dark:bg-stone-800',
      addBtnBorderHover: 'hover:border-stone-400',
      addBtnTextHover: 'hover:text-stone-600',
      addBtnBorderHoverDark: 'dark:hover:border-stone-500',
      dragHandleHover: 'hover:text-stone-500',
    },
    previewGradient: 'from-stone-300 to-stone-500',
  },
  pop: {
    id: 'pop',
    name: 'ポップ',
    description: '明るく楽しい旅行向け',
    icon: 'i-lucide-party-popper',
    colors: {
      accent: 'text-orange-500 dark:text-orange-400',
      dayHeader: 'text-orange-500 dark:text-orange-400',
      link: 'text-orange-500 dark:text-orange-400',
      linkHover: 'hover:text-orange-600 dark:hover:text-orange-300',
      eventIconText: 'text-orange-500 dark:text-orange-400',
      accentBg: 'bg-orange-50',
      accentBgDark: 'dark:bg-orange-900/20',
      eventIconBg: 'bg-orange-50 dark:bg-orange-900/20',
      headerGradient: 'from-orange-400 via-pink-400 to-yellow-400',
      headerBg: 'bg-orange-50/60',
      headerBgDark: 'dark:bg-orange-950/30',
      cardBorderHover: 'hover:border-orange-200 dark:hover:border-orange-800',
      cardLeftBorder: 'border-l-orange-400 dark:border-l-orange-500',
      badgeText: 'text-orange-600 dark:text-orange-300',
      badgeBg: 'bg-orange-50 dark:bg-orange-900/30',
      addBtnBorderHover: 'hover:border-orange-300',
      addBtnTextHover: 'hover:text-orange-500',
      addBtnBorderHoverDark: 'dark:hover:border-orange-600',
      dragHandleHover: 'hover:text-orange-400',
    },
    previewGradient: 'from-orange-400 via-pink-400 to-yellow-400',
  },
  wafuu: {
    id: 'wafuu',
    name: '和風',
    description: '京都・温泉など和の旅に',
    icon: 'i-lucide-fan',
    colors: {
      accent: 'text-amber-700 dark:text-amber-400',
      dayHeader: 'text-amber-700 dark:text-amber-400',
      link: 'text-amber-700 dark:text-amber-400',
      linkHover: 'hover:text-amber-800 dark:hover:text-amber-300',
      eventIconText: 'text-amber-700 dark:text-amber-400',
      accentBg: 'bg-amber-50',
      accentBgDark: 'dark:bg-amber-900/20',
      eventIconBg: 'bg-amber-50 dark:bg-amber-900/20',
      headerGradient: 'from-amber-600 via-amber-500 to-yellow-600',
      headerBg: 'bg-amber-50/50',
      headerBgDark: 'dark:bg-amber-950/30',
      cardBorderHover: 'hover:border-amber-200 dark:hover:border-amber-800',
      cardLeftBorder: 'border-l-amber-500 dark:border-l-amber-600',
      badgeText: 'text-amber-700 dark:text-amber-300',
      badgeBg: 'bg-amber-50 dark:bg-amber-900/30',
      addBtnBorderHover: 'hover:border-amber-300',
      addBtnTextHover: 'hover:text-amber-600',
      addBtnBorderHoverDark: 'dark:hover:border-amber-600',
      dragHandleHover: 'hover:text-amber-500',
    },
    previewGradient: 'from-amber-600 via-amber-500 to-yellow-600',
  },
  resort: {
    id: 'resort',
    name: 'リゾート',
    description: '海・南国リゾートの旅に',
    icon: 'i-lucide-palm-tree',
    colors: {
      accent: 'text-cyan-500 dark:text-cyan-400',
      dayHeader: 'text-cyan-500 dark:text-cyan-400',
      link: 'text-cyan-500 dark:text-cyan-400',
      linkHover: 'hover:text-cyan-600 dark:hover:text-cyan-300',
      eventIconText: 'text-cyan-500 dark:text-cyan-400',
      accentBg: 'bg-cyan-50',
      accentBgDark: 'dark:bg-cyan-900/20',
      eventIconBg: 'bg-cyan-50 dark:bg-cyan-900/20',
      headerGradient: 'from-cyan-400 via-sky-400 to-blue-400',
      headerBg: 'bg-cyan-50/50',
      headerBgDark: 'dark:bg-cyan-950/30',
      cardBorderHover: 'hover:border-cyan-200 dark:hover:border-cyan-800',
      cardLeftBorder: 'border-l-cyan-400 dark:border-l-cyan-500',
      badgeText: 'text-cyan-600 dark:text-cyan-300',
      badgeBg: 'bg-cyan-50 dark:bg-cyan-900/30',
      addBtnBorderHover: 'hover:border-cyan-300',
      addBtnTextHover: 'hover:text-cyan-500',
      addBtnBorderHoverDark: 'dark:hover:border-cyan-600',
      dragHandleHover: 'hover:text-cyan-400',
    },
    previewGradient: 'from-cyan-400 via-sky-400 to-blue-400',
  },
  nature: {
    id: 'nature',
    name: 'ナチュラル',
    description: 'キャンプ・自然の旅に',
    icon: 'i-lucide-trees',
    colors: {
      accent: 'text-green-600 dark:text-green-400',
      dayHeader: 'text-green-600 dark:text-green-400',
      link: 'text-green-600 dark:text-green-400',
      linkHover: 'hover:text-green-700 dark:hover:text-green-300',
      eventIconText: 'text-green-600 dark:text-green-400',
      accentBg: 'bg-green-50',
      accentBgDark: 'dark:bg-green-900/20',
      eventIconBg: 'bg-green-50 dark:bg-green-900/20',
      headerGradient: 'from-green-500 via-emerald-400 to-lime-400',
      headerBg: 'bg-green-50/50',
      headerBgDark: 'dark:bg-green-950/30',
      cardBorderHover: 'hover:border-green-200 dark:hover:border-green-800',
      cardLeftBorder: 'border-l-green-500 dark:border-l-green-600',
      badgeText: 'text-green-600 dark:text-green-300',
      badgeBg: 'bg-green-50 dark:bg-green-900/30',
      addBtnBorderHover: 'hover:border-green-300',
      addBtnTextHover: 'hover:text-green-600',
      addBtnBorderHoverDark: 'dark:hover:border-green-600',
      dragHandleHover: 'hover:text-green-500',
    },
    previewGradient: 'from-green-500 via-emerald-400 to-lime-400',
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
