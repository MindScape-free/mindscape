// ESLint Flat Config — Next.js 16 with ESLint v9
// See: https://nextjs.org/docs/app/api-reference/config/eslint

import nextConfig from 'eslint-config-next';
import tsPlugin from '@typescript-eslint/eslint-plugin';

/** @type {import('eslint').Linter.Config[]} */
const config = [
  // Next.js base config with all plugins
  ...nextConfig,

  // Project-specific overrides
  {
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // Allow console.log throughout
      'no-console': 'off',

      // Prevent unused variables — use TS-aware rule for better coverage
      'no-unused-vars': 'off', // base rule off to avoid conflicts
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none', // allow catch(e) without using e
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true, // allow `const {a, ...rest} = obj`
        },
      ],
    },
  },

  // Ignore non-source directories
  {
    ignores: [
      'scripts/**',
      'supabase/**',
      'public/**',
    ],
  },
];

export default config;
