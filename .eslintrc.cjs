module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 2021,
    sourceType: 'module',
    extraFileExtensions: ['.vue']
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
    'plugin:@typescript-eslint/recommended',
    '@vue/eslint-config-typescript',
    'plugin:prettier/recommended'
  ],
  plugins: ['vue', '@typescript-eslint', 'unused-imports', 'import'],
  rules: {
    'vue/multi-word-component-names': 'off',
    // 逐步启用严格规则 - 从 warn 开始
    '@typescript-eslint/no-explicit-any': 'warn', // 改为 warn，逐步修复
    '@typescript-eslint/ban-ts-comment': 'warn', // 改为 warn，需要说明原因
    'unused-imports/no-unused-imports': 'error',
    'import/order': [
      'warn',
      {
        groups: [['builtin', 'external'], ['internal'], ['parent', 'sibling', 'index']],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true }
      }
    ]
  },
  ignorePatterns: ['dist/', 'node_modules/', '*.config.*', '*.d.ts', '**/dist/**']
}
