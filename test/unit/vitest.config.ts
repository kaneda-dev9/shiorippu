import { defineProject } from 'vitest/config'
import { resolve } from 'node:path'

export default defineProject({
  test: {
    name: 'unit',
    include: ['**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '~~': resolve(__dirname, '../..'),
    },
  },
})
