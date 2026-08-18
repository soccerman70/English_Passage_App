import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // design_handoff_* 는 디자인 시안 번들이다. 우리가 고칠 코드가 아니라 참고 자료라 검사에서 뺀다.
  globalIgnores(['dist', 'samples', 'design_handoff_*']),
  {
    // Vite 미들웨어와 도구 스크립트는 Node에서 돈다
    files: ['server/**/*.js', 'tools/**/*.mjs', 'vite.config.js'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
])
