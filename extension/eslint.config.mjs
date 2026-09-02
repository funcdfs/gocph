import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

const NODE_BUILTINS = ['fs', 'path', 'child_process', 'os', 'http', 'crypto', 'net', 'util'];

export default tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.{ts,tsx}'],
        plugins: { react, 'react-hooks': reactHooks },
        languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
        settings: { react: { version: 'detect' } },
        rules: {
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'react/react-in-jsx-scope': 'off',
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
        },
    },

    // ---- 分层约束：让依赖方向由工具保证，而不是靠自觉 ----

    // shared / webview 跑在浏览器里，不能碰 vscode、node 内置模块，也不能反向依赖主进程代码
    {
        files: ['src/shared/**', 'src/webview/**'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    paths: ['vscode', ...NODE_BUILTINS],
                    patterns: [
                        { group: ['node:*'], message: 'webview / shared 不能使用 node 内置模块' },
                        { group: ['**/host/**'], message: 'webview / shared 不能依赖主进程代码' },
                    ],
                },
            ],
        },
    },

    // 题目文件格式与评测核心是纯逻辑，不依赖 vscode，保证能在 vitest 里直接跑
    {
        files: ['src/host/problem/**', 'src/host/judge/compile.ts', 'src/host/judge/run.ts', 'src/host/judge/compare.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                { paths: [{ name: 'vscode', message: '纯逻辑模块不依赖 vscode，把 UI 交给调用方' }] },
            ],
        },
    },

    { ignores: ['dist/**', 'node_modules/**', 'scripts/**', '*.config.*'] },
);
