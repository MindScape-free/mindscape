// ESLint Flat Config — Next.js 16 with ESLint v9
// See: https://nextjs.org/docs/app/api-reference/config/eslint

import nextConfig from 'eslint-config-next';

/** @type {import('eslint').Linter.Config[]} */
const config = [
  // Next.js base config with all plugins
  ...nextConfig,

  // Project-specific overrides
  {
    rules: {
      // Allow console.log throughout
      'no-console': 'off',
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
