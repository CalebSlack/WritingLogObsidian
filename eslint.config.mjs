// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error', // Enforces Prettier as ESLint rule
      '@typescript-eslint/no-unused-vars': 'error',
    },
  },
  {
    ignores: ['node_modules/**', 'dist/**', '__tests__/**', '*.cjs', '*.js'],
  },

  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  }
);
