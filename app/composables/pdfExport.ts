import type { jsPDF } from 'jspdf'
import type { ShioriWithDays } from '~~/types/database'
import { tryOnScopeDispose } from '@vueuse/core'

/** PDF出力の状態管理とプレビュー・ダウンロード機能を提供 */
export function usePdfExport() {
  const generating = ref<boolean>(false)
  const error = ref<string | null>(null)
  const previewUrl = ref<string | null>(null)
  const toast = useToast()

  // 生成済みの jsPDF インスタンスを保持
  let currentDoc: jsPDF | null = null
  let currentTitle = ''

  /** PDFを生成してプレビューURLを作成 */
  async function generatePreview(shiori: ShioriWithDays) {
    if (generating.value) return
    generating.value = true
    error.value = null

    // 前回のプレビューURLを解放
    revokePreview()

    try {
      const { generateShioriPdf } = await import('~~/shared/pdf/renderer')
      const doc = await generateShioriPdf(shiori)
      currentDoc = doc
      currentTitle = shiori.title || 'しおり'

      // Blob URLを生成してプレビュー表示
      const blob = doc.output('blob')
      previewUrl.value = URL.createObjectURL(blob)
    }
    catch (e) {
      console.error('PDF生成エラー:', e)
      error.value = e instanceof Error ? e.message : 'PDF生成に失敗しました'
      toast.add({ title: 'PDF生成に失敗しました', color: 'error' })
    }
    finally {
      generating.value = false
    }
  }

  /** 生成済みPDFをダウンロード */
  function downloadPdf() {
    if (!currentDoc) return
    currentDoc.save(`${currentTitle}.pdf`)
    toast.add({ title: 'PDFをダウンロードしました', color: 'success' })
  }

  /** プレビューURLを解放 */
  function revokePreview() {
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
      previewUrl.value = null
    }
    currentDoc = null
  }

  // スコープ破棄時にURLを解放
  tryOnScopeDispose(revokePreview)

  return {
    generating,
    error,
    previewUrl,
    generatePreview,
    downloadPdf,
    revokePreview,
  }
}
