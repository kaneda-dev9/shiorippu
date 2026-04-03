import type { Component, App } from 'vue'
import { createApp, getCurrentInstance } from 'vue'
import { tryOnScopeDispose } from '@vueuse/core'

/**
 * Vueコンポーネントを独立したDOM要素にマウントするユーティリティ
 * 親のappContext（provide/inject、plugins、グローバルコンポーネント等）を継承するため、
 * Nuxt UIなどのコンテキスト依存コンポーネントもそのまま利用できる。
 *
 * 主な用途: Google Maps InfoWindow など、Vueツリー外のDOMにコンポーネントを描画する場合
 */
export interface MountComponentResult {
  /** マウント先のコンテナ要素（setContent等に渡す） */
  el: HTMLElement
  /** 手動でアンマウントする */
  unmount: () => void
}

export function useMountComponent() {
  const instance = getCurrentInstance()
  const parentAppContext = instance?.appContext
  const mountedApps: App[] = []

  /**
   * コンポーネントをDOM要素にマウントする
   * @param component - マウントするVueコンポーネント
   * @param props - コンポーネントに渡すprops
   */
  function mount<T extends Record<string, unknown>>(
    component: Component,
    props?: T,
  ): MountComponentResult {
    const container = document.createElement('div')
    const app = createApp(component, props as Record<string, unknown>)

    // 親のappContextを継承（provide/inject、グローバルコンポーネント、ディレクティブ）
    if (parentAppContext) {
      Object.assign(app._context.provides, parentAppContext.provides)
      Object.assign(app._context.components, parentAppContext.components)
      Object.assign(app._context.directives, parentAppContext.directives)
      app._context.mixins = [...parentAppContext.mixins]
      app._context.config.globalProperties = { ...parentAppContext.config.globalProperties }
    }

    app.mount(container)
    mountedApps.push(app)

    const unmount = () => {
      app.unmount()
      const idx = mountedApps.indexOf(app)
      if (idx >= 0) mountedApps.splice(idx, 1)
    }

    return { el: container, unmount }
  }

  /** 全てのマウント済みアプリをアンマウント */
  function unmountAll() {
    for (const app of mountedApps) {
      app.unmount()
    }
    mountedApps.length = 0
  }

  // スコープ破棄時に自動クリーンアップ
  tryOnScopeDispose(unmountAll)

  return { mount, unmountAll }
}
