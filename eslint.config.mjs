// Shared ESLint flat config for the whole monorepo.
// Phase 2 of apps/docs/CODEBASE_CLEANUP_PLAN.md: rules that the current code
// breaks often are warnings, so CI keeps passing while the counts go down.
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: [
            '**/node_modules/**',
            '**/dist/**',
            '**/build/**',
            '**/coverage/**',
            '**/.turbo/**',
            'apps/web/public/**',
            'templates/**',
            'Admin Templates/**',
            'sample templates/**',
            'Free CV Builder/**',
            'nexcv-legacy-build/**',
        ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.{js,mjs,cjs,ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.node,
            },
        },
        rules: {
            // Input sanitizers intentionally match control characters such as \x00-\x1f.
            'no-control-regex': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_',
                ignoreRestSiblings: true,
            }],
        },
    },
    {
        files: ['apps/web/src/**/*.{ts,tsx}'],
        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },
        plugins: {
            'react-hooks': reactHooks,
        },
        rules: {
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
        },
    },
    {
        // Build scripts pass callbacks to Puppeteer's page.evaluate(), which run in the browser.
        files: ['apps/web/scripts/**/*.{js,mjs}'],
        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },
    },
    {
        files: ['**/*.cjs'],
        languageOptions: {
            sourceType: 'commonjs',
        },
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
        },
    },
);
