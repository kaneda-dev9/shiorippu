/** Day番号に対応する色（マーカー・ポリライン用） */
export const DAY_COLORS = [
  '#ea580c', // orange-600 (Day 1)
  '#2563eb', // blue-600 (Day 2)
  '#16a34a', // green-600 (Day 3)
  '#9333ea', // purple-600 (Day 4)
  '#dc2626', // red-600 (Day 5)
  '#0891b2', // cyan-600 (Day 6)
  '#ca8a04', // yellow-600 (Day 7)
] as const

/** Day番号(1-indexed)から色を取得 */
export function getDayColor(dayNumber: number): string {
  return DAY_COLORS[(dayNumber - 1) % DAY_COLORS.length] ?? DAY_COLORS[0]
}
