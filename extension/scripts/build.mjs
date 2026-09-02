/**
 * 一次构建两端：
 *   host    src/extension.ts   → dist/extension.js   (Node, CommonJS, vscode 外置)
 *   webview src/webview/main.tsx → dist/webview.js + dist/webview.css + dist/codicon.ttf (浏览器, IIFE)
 * 用法：node scripts/build.mjs [--watch]
 */
import * as esbuild from 'esbuild';
import { rmSync } from 'node:fs';

const watch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const host = {
    entryPoints: ['src/extension.ts'],
    outfile: 'dist/extension.js',
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    external: ['vscode'],
    sourcemap: watch ? 'inline' : false,
    logLevel: 'info',
};

/** @type {import('esbuild').BuildOptions} */
const webview = {
    entryPoints: ['src/webview/main.tsx'],
    outfile: 'dist/webview.js',
    bundle: true,
    platform: 'browser',
    format: 'iife',
    target: 'es2020',
    jsx: 'automatic',
    minify: !watch,
    sourcemap: watch ? 'inline' : false,
    define: { 'process.env.NODE_ENV': watch ? '"development"' : '"production"' },
    // codicon.css 里引用的字体文件原样拷到 dist，文件名不加 hash
    loader: { '.ttf': 'file' },
    assetNames: '[name]',
    logLevel: 'info',
};

rmSync('dist', { recursive: true, force: true });

if (watch) {
    const contexts = await Promise.all([esbuild.context(host), esbuild.context(webview)]);
    await Promise.all(contexts.map((ctx) => ctx.watch()));
    console.log('[build] watching src/ …');
} else {
    await Promise.all([esbuild.build(host), esbuild.build(webview)]);
}
