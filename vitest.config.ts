import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      'test/unit/vitest.config.ts',
      'test/nuxt/vitest.config.ts',
      'test/rls/vitest.config.ts',
    ],
  },
})
