import { defineProject } from 'vitest/config'

export default defineProject({
  test: {
    name: 'rls',
    include: ['**/*.test.ts'],
    environment: 'node',
    testTimeout: 15000,
    setupFiles: ['./setup.ts'],
  },
})
