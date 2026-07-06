import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/essential'],
  prettier,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
)
