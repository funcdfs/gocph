/**
 * 在真实 VS Code 里跑 suite.ts：扩展以开发模式加载，实例使用独立的 user-data / extensions 目录，
 * 并把 golang.go（gopls）装进去，复现 gopls 与 region 折叠 provider 共存的真实环境。
 *
 * 用法：npm run test:vscode [-- --no-gopls] [-- --download]
 *   默认优先使用本机已安装的 VS Code（/Applications/Visual Studio Code.app）与本机已装的 golang.go，
 *   不走网络；--download 则从官网下载稳定版到 .vscode-test/。
 */
import { downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath, runTests } from '@vscode/test-electron';
import * as esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const cache = path.join(root, '.vscode-test');
const withGopls = !process.argv.includes('--no-gopls');
const forceDownload = process.argv.includes('--download');
const LOCAL_APP = '/Applications/Visual Studio Code.app/Contents/MacOS/Code';

if (!existsSync(path.join(root, 'dist', 'extension.js'))) {
    console.error('先执行 npm run build');
    process.exit(1);
}

await esbuild.build({
    entryPoints: [path.join(root, 'test', 'vscode', 'suite.ts')],
    outfile: path.join(cache, 'suite.js'),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    external: ['vscode'],
    logLevel: 'warning',
});

const vscodeExecutablePath =
    !forceDownload && existsSync(LOCAL_APP) ? LOCAL_APP : await downloadAndUnzipVSCode('stable');
console.log(`[test:vscode] 使用 ${vscodeExecutablePath}`);
const extensionsDir = path.join(cache, 'extensions');
const userDataDir = path.join(cache, 'user-data');

if (withGopls) {
    installGoExtension(vscodeExecutablePath, extensionsDir);
}

const workspace = path.join(cache, 'workspace');
rmSync(workspace, { recursive: true, force: true });
mkdirSync(workspace, { recursive: true });
writeFileSync(path.join(workspace, 'go.mod'), 'module gocph-test\n\ngo 1.22\n');

await runTests({
    vscodeExecutablePath,
    extensionDevelopmentPath: root,
    extensionTestsPath: path.join(cache, 'suite.js'),
    launchArgs: [workspace, `--extensions-dir=${extensionsDir}`, `--user-data-dir=${userDataDir}`, ...(withGopls ? [] : ['--disable-extensions'])],
});

/** 优先复制本机已安装的 golang.go（不走网络），没有再用 CLI 从 marketplace 安装 */
function installGoExtension(executablePath, extensionsDir) {
    mkdirSync(extensionsDir, { recursive: true });
    if (readdirSync(extensionsDir).some((name) => name.startsWith('golang.go-'))) {
        console.log('[test:vscode] golang.go 已在测试实例中');
        return;
    }
    const userExtensions = path.join(os.homedir(), '.vscode', 'extensions');
    const local = existsSync(userExtensions) && readdirSync(userExtensions).find((name) => name.startsWith('golang.go-'));
    if (local) {
        cpSync(path.join(userExtensions, local), path.join(extensionsDir, local), { recursive: true });
        console.log(`[test:vscode] 已复制本机的 ${local}`);
        return;
    }
    const [cli, ...args] = resolveCliArgsFromVSCodeExecutablePath(executablePath);
    const result = spawnSync(cli, [...args, `--extensions-dir=${extensionsDir}`, '--install-extension', 'golang.go'], {
        encoding: 'utf-8',
    });
    console.log(result.stdout.trim());
    if (result.status !== 0) {
        console.error(result.stderr);
        process.exit(result.status ?? 1);
    }
}
