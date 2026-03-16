import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    // DOMPurifyでサニタイズ済みのケースがあるため無効化
    'vue/no-v-html': 'off',
  },
})
