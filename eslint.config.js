import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'test-results/', 'playwright-report/', 'coverage/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
    },
  },
  {
    // Node scripts and config files.
    files: ['scripts/**/*.mjs', '*.config.{js,ts}', 'tests/smoke/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // ADR 0002: game rules are plain TypeScript. No Phaser, no scenes, no browser globals.
    files: ['src/logic/**/*.ts'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'phaser', message: 'src/logic must not import Phaser (ADR 0002).' }],
          patterns: [
            { group: ['**/scenes/**', '**/ui/**', '**/state/**'], message: 'Logic never calls scenes or UI (ADR 0002).' },
          ],
        },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use the seeded Rng from src/logic/rng.ts (ADR 0002).' },
        { object: 'Date', property: 'now', message: 'Pass the time in, so rules stay deterministic (ADR 0002).' },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage'],
    },
  },
);
