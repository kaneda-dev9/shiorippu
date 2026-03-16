import { describe, expect, it } from 'vitest'
import { getTemplate, getTemplateList, templates } from '~~/shared/templates'

describe('getTemplate', () => {
  it('有効なIDでテンプレートを返す', () => {
    expect(getTemplate('pop')).toBe(templates.pop)
    expect(getTemplate('wafuu')).toBe(templates.wafuu)
  })

  it('無効なIDはsimpleにフォールバック', () => {
    expect(getTemplate('nonexistent')).toBe(templates.simple)
  })

  it('null/undefinedはsimpleにフォールバック', () => {
    expect(getTemplate(null)).toBe(templates.simple)
    expect(getTemplate(undefined)).toBe(templates.simple)
  })
})

describe('getTemplateList', () => {
  it('全テンプレートを配列で返す', () => {
    const list = getTemplateList()
    expect(list).toHaveLength(Object.keys(templates).length)
    expect(list).toContain(templates.simple)
    expect(list).toContain(templates.nature)
  })
})
