// @ts-check
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default tseslint.config(
  {
    ignores: ['dist', 'coverage', 'node_modules', 'docs/stitch-prototypes'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // CLAUDE.md regla 2: NUNCA `any`. Esto le da enforcement automático.
      '@typescript-eslint/no-explicit-any': 'error',

      // El codebase usa `void promesa` deliberadamente en handlers de antd
      // (onClick, onOk) para marcar promesas no esperadas. Sin esta opción,
      // no-floating-promises marcaría ~40 sitios correctos.
      '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: true }],
    },
  },
  {
    // Los tests usan globals de Vitest y aserciones que disparan reglas
    // pensadas para código de producción.
    files: ['src/test/**', '**/*.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },
  {
    files: ['*.config.{js,ts}', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
    extends: [tseslint.configs.disableTypeChecked],
  },
)
