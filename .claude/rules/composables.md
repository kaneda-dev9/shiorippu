# Composable作成ルール

## 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| ファイル名 | camelCase | `postcodeLocation.ts` |
| 関数名 | `use` + PascalCase | `usePostcodeLocation()` |
| 戻り値の型 | PascalCase + Result/Options | `PostcodeLocationResult` |

配置先: `src/composables/`

## 実装の注意点

- 戻り値の型と Ref の型を明示的に定義する（`ref<boolean>(false)`, `computed<CSSProperties>(() => ...)`）
- 公開インターフェースはファイル冒頭で export、内部型は export しない
- クリーンアップが必要な場合は `tryOnScopeDispose`（`@vueuse/core`）を使用する
