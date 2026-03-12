/** カバー画像プリセット定義 */

export interface CoverImagePreset {
  id: string
  path: string       // /covers/xxx.webp
  label: string      // 日本語ラベル
  category: CoverCategory
  tags: string[]     // AI自動選択用のマッチングタグ
}

export type CoverCategory =
  | 'city'
  | 'temple'
  | 'nature'
  | 'beach'
  | 'mountain'
  | 'onsen'
  | 'snow'
  | 'season'
  | 'other'

export const coverCategories: { value: CoverCategory; label: string }[] = [
  { value: 'city', label: '都市' },
  { value: 'temple', label: '寺社' },
  { value: 'nature', label: '自然' },
  { value: 'beach', label: 'ビーチ' },
  { value: 'mountain', label: '山' },
  { value: 'onsen', label: '温泉' },
  { value: 'snow', label: '雪' },
  { value: 'season', label: '季節' },
  { value: 'other', label: 'その他' },
]

export const coverImagePresets: CoverImagePreset[] = [
  // 都市
  {
    id: 'city-tokyo',
    path: '/covers/city-tokyo.webp',
    label: '東京',
    category: 'city',
    tags: ['東京', 'tokyo', '渋谷', '新宿', '浅草', '秋葉原', '原宿', '銀座', '六本木', '池袋', '上野', 'お台場', 'スカイツリー', '東京タワー', '都内', '首都圏'],
  },
  {
    id: 'city-osaka',
    path: '/covers/city-osaka.webp',
    label: '大阪',
    category: 'city',
    tags: ['大阪', 'osaka', '道頓堀', '難波', 'なんば', '梅田', '心斎橋', '通天閣', 'USJ', 'ユニバ', '天王寺', '関西'],
  },
  {
    id: 'night-city',
    path: '/covers/night-city.webp',
    label: '夜景',
    category: 'city',
    tags: ['夜景', '夜', 'ナイト', 'イルミネーション', '横浜', 'みなとみらい', '神戸', '函館', '長崎', '札幌'],
  },
  // 寺社
  {
    id: 'kyoto-temple',
    path: '/covers/kyoto-temple.webp',
    label: '京都・寺社',
    category: 'temple',
    tags: ['京都', 'kyoto', '寺', '神社', '仏閣', '伏見稲荷', '金閣寺', '銀閣寺', '清水寺', '嵐山', '祇園', '鳥居'],
  },
  {
    id: 'kyoto-bamboo',
    path: '/covers/kyoto-bamboo.webp',
    label: '竹林',
    category: 'temple',
    tags: ['竹林', '嵐山', '竹', '京都'],
  },
  {
    id: 'shrine',
    path: '/covers/shrine.webp',
    label: '神社',
    category: 'temple',
    tags: ['神社', '鳥居', '参拝', '奈良', '出雲', '伊勢', '厳島', '鎌倉', '初詣', '御朱印'],
  },
  // 自然
  {
    id: 'nature-forest',
    path: '/covers/nature-forest.webp',
    label: '森林',
    category: 'nature',
    tags: ['森', '森林', '林', '木', '緑', 'ハイキング', 'トレッキング', '散策', '自然', '屋久島', '白神山地'],
  },
  {
    id: 'nature-river',
    path: '/covers/nature-river.webp',
    label: '川・渓谷',
    category: 'nature',
    tags: ['川', '渓谷', '滝', '清流', '渓流', '峡谷', '奥入瀬', '高千穂'],
  },
  {
    id: 'countryside',
    path: '/covers/countryside.webp',
    label: '田舎・田園',
    category: 'nature',
    tags: ['田舎', '田園', '田んぼ', '棚田', '農村', '里山', '牧場', 'のどか'],
  },
  // ビーチ
  {
    id: 'beach-tropical',
    path: '/covers/beach-tropical.webp',
    label: 'ビーチ',
    category: 'beach',
    tags: ['海', 'ビーチ', '砂浜', '沖縄', '宮古島', '石垣島', '奄美', '南国', 'サーフィン', '海水浴', 'マリン'],
  },
  {
    id: 'beach-sunset',
    path: '/covers/beach-sunset.webp',
    label: 'サンセット',
    category: 'beach',
    tags: ['夕日', 'サンセット', '夕焼け', '海岸', '湘南', '江ノ島'],
  },
  // 山
  {
    id: 'mountain-fuji',
    path: '/covers/mountain-fuji.webp',
    label: '富士山',
    category: 'mountain',
    tags: ['富士山', 'fuji', '富士', '河口湖', '山梨', '静岡', '箱根'],
  },
  {
    id: 'mountain-alps',
    path: '/covers/mountain-alps.webp',
    label: '山岳',
    category: 'mountain',
    tags: ['山', '登山', 'アルプス', '山岳', '高原', '上高地', '立山', '信州', '長野', '北アルプス'],
  },
  // 温泉
  {
    id: 'onsen',
    path: '/covers/onsen.webp',
    label: '温泉',
    category: 'onsen',
    tags: ['温泉', 'おんせん', 'onsen', '露天風呂', '旅館', '湯', '別府', '草津', '箱根', '有馬', '下呂', '道後', '銀山温泉', '湯布院'],
  },
  // 雪
  {
    id: 'snow-village',
    path: '/covers/snow-village.webp',
    label: '雪景色',
    category: 'snow',
    tags: ['雪', '冬', 'スキー', 'スノーボード', '白川郷', '雪景色', '豪雪', 'ニセコ', '蔵王', 'かまくら'],
  },
  // 季節
  {
    id: 'sakura',
    path: '/covers/sakura.webp',
    label: '桜',
    category: 'season',
    tags: ['桜', 'さくら', 'sakura', '花見', 'お花見', '春', '吉野'],
  },
  {
    id: 'autumn',
    path: '/covers/autumn.webp',
    label: '紅葉',
    category: 'season',
    tags: ['紅葉', 'もみじ', '秋', '紅葉狩り', 'autumn'],
  },
  // その他
  {
    id: 'food',
    path: '/covers/food.webp',
    label: 'グルメ',
    category: 'other',
    tags: ['グルメ', '食べ歩き', 'ラーメン', '寿司', '焼肉', '食事', 'カフェ巡り', 'スイーツ'],
  },
  {
    id: 'resort',
    path: '/covers/resort.webp',
    label: 'リゾート',
    category: 'other',
    tags: ['リゾート', 'ホテル', 'プール', 'ヴィラ', 'スパ', 'ラグジュアリー'],
  },
  {
    id: 'default',
    path: '/covers/default.webp',
    label: '旅行',
    category: 'other',
    tags: ['旅行', '旅', 'trip', 'travel'],
  },
]

/** IDからプリセットを取得 */
export function getCoverImageById(id: string): CoverImagePreset | undefined {
  return coverImagePresets.find((p) => p.id === id)
}

/** パスからプリセットを取得 */
export function getCoverImageByPath(path: string): CoverImagePreset | undefined {
  return coverImagePresets.find((p) => p.path === path)
}

/** カテゴリでフィルタ */
export function getCoverImagesByCategory(category: CoverCategory): CoverImagePreset[] {
  return coverImagePresets.filter((p) => p.category === category)
}

/** デフォルトのカバー画像 */
export function getDefaultCoverImage(): CoverImagePreset {
  return coverImagePresets.find((p) => p.id === 'default')!
}
