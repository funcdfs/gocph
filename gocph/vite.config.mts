import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Frontend webview 构建配置
export default defineConfig({
    plugins: [react()],
    build: {
        outDir: 'dist',
        emptyOutDir: false,
        rollupOptions: {
            input: resolve(__dirname, 'src/webview/frontend/App.tsx'),
            output: {
                entryFileNames: 'frontend.module.js',
                format: 'iife',
                inlineDynamicImports: true,
            },
        },
        minify: 'esbuild',
        sourcemap: false,
    },
    define: {
        'process.env.NODE_ENV': JSON.stringify('production'),
    },
});
