import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'

function withLegacyBaseline(config) {
  const rules = { ...config.rules }

  if (config.plugins?.['@typescript-eslint'] || '@typescript-eslint/no-explicit-any' in rules) {
    rules['@typescript-eslint/no-explicit-any'] = 'warn'
  }
  if (config.plugins?.['@typescript-eslint'] || '@typescript-eslint/no-require-imports' in rules) {
    rules['@typescript-eslint/no-require-imports'] = 'off'
  }
  if (config.plugins?.react) {
    rules['react/no-unescaped-entities'] = 'warn'
  }
  if (config.plugins?.['react-hooks']) {
    rules['react-hooks/preserve-manual-memoization'] = 'off'
    rules['react-hooks/set-state-in-effect'] = 'off'
    rules['react-hooks/static-components'] = 'off'
  }

  return { ...config, rules }
}

export default defineConfig([
  // These stricter rules were introduced after this React 18 codebase. Keep
  // the findings visible while CI blocks newly introduced hard errors.
  ...nextVitals.map(withLegacyBaseline),
  ...nextTypeScript.map(withLegacyBaseline),
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'dist/**',
    'playwright-report/**',
    'test-results/**',
    'next-env.d.ts',
  ]),
])
