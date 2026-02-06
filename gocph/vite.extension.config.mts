import { defineConfig } from 'vite';
import { resolve } from 'path';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { builtinModules } from 'module';

// 生成构建信息
function generateBuildInfo() {
    return {
        name: 'generate-build-info',
        buildStart() {
            try {
                const gitCommitHash = execSync('git rev-parse HEAD').toString().trim();
                const licenseString = readFileSync(resolve(__dirname, 'LICENSE'), 'utf8');
                const dateTime = new Date().toISOString();

                const generated = { gitCommitHash, licenseString, dateTime };
                mkdirSync(resolve(__dirname, 'dist'), { recursive: true });
                writeFileSync(
                    resolve(__dirname, 'dist/generated.json'),
                    JSON.stringify(generated, null, 2)
                );
            } catch {
                // ignore errors in build info generation
            }
        },
    };
}

// Extension 构建配置 (Node.js 环境)
export default defineConfig({
    plugins: [generateBuildInfo()],
    build: {
        outDir: 'dist',
        emptyOutDir: false,
        lib: {
            entry: resolve(__dirname, 'src/extension.ts'),
            formats: ['cjs'],
        },
        rollupOptions: {
            output: {
                entryFileNames: 'extension.js',
            },
            external: [
                'vscode',
                ...builtinModules,
                ...builtinModules.map((m) => `node:${m}`),
            ],
        },
        minify: false,
        sourcemap: false,
        target: 'node18',
        ssr: true,
    },
});
