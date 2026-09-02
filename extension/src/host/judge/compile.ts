/**
 * go build。只返回结果，不碰 vscode，也不弹任何提示。
 */
import { spawn } from 'child_process';
import * as path from 'path';

export interface CompileOptions {
    goCommand: string;
    extraArgs: string[];
}

export type CompileResult =
    | { ok: true; stderr: string }
    | { ok: false; stderr: string; exitCode: number | null; spawnError?: Error };

/** 非 ASCII 字符转成 _uXXXX，避免二进制文件名在部分平台上出问题 */
export function toAsciiFilename(input: string): string {
    return Array.from(input)
        .map((ch) => {
            const code = ch.charCodeAt(0);
            return code < 128 ? ch : `_u${code.toString(16).padStart(4, '0')}`;
        })
        .join('');
}

/** 二进制放在源文件同目录，运行完即删 */
export function binaryPathFor(srcPath: string): string {
    const { dir, name } = path.parse(srcPath);
    const ext = process.platform === 'win32' ? '.exe' : '.bin';
    return path.join(dir, toAsciiFilename(name) + ext);
}

export function compile(srcPath: string, opts: CompileOptions): Promise<CompileResult> {
    // 额外参数必须放在文件名前面：go 的 flag 解析遇到第一个非 flag 参数就停止
    const args = ['build', ...opts.extraArgs, '-o', binaryPathFor(srcPath), srcPath];

    return new Promise((resolve) => {
        let settled = false;
        const finish = (result: CompileResult): void => {
            if (!settled) {
                settled = true;
                resolve(result);
            }
        };

        let stderr = '';
        try {
            const child = spawn(opts.goCommand, args, { env: process.env });
            child.stderr.on('data', (chunk) => {
                stderr += chunk;
            });
            child.on('error', (err) => finish({ ok: false, stderr, exitCode: null, spawnError: err }));
            child.on('close', (code) =>
                finish(code === 0 ? { ok: true, stderr } : { ok: false, stderr, exitCode: code }),
            );
        } catch (err) {
            finish({ ok: false, stderr, exitCode: null, spawnError: err as Error });
        }
    });
}
