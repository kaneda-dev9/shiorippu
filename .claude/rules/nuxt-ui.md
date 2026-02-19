# Nuxt UI ルール

## バージョン
- Nuxt UI v4 を使用（v3からの主な変更: ButtonGroup→FieldGroup、Nuxt UI Pro統合）
- v3のコードを参考にする場合はマイグレーションガイドを確認: https://ui.nuxt.com/docs/getting-started/migration/v4
- アイコンは Lucide: `i-lucide-icon-name` 形式

## カラー
- primary: `orange`
- neutral: `stone`
- error: `error`（`red` ではなく `error` を使う）
- success: `success`
- warning: `warning`
- info: `info`

## コンポーネント利用方針
- ボタンは `UButton` (variant: default/soft/outline/ghost)
- カードは `UCard`
- フォームは Nuxt UI のフォームコンポーネントを優先使用
- モーダルは `UModal`、サイドパネルは `USlideover`
- 通知は `useToast()`

## レスポンシブ
- モバイルファースト
- Tailwind のブレークポイント: `sm:`, `md:`, `lg:`
- ヘッダーのナビはPC表示、モバイルはハンバーガーメニュー
