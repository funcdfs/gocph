/**
 * 运行编译好的二进制，喂入 stdin，收集 stdout / stderr 与耗时。只返回数据，不碰 vscode。
 */
import { spawn, type ChildProcess } from 'child_process';
import { unlink } from 'fs';
import type { Run } from '../../shared/problem';

/** 输出超过这么多行就截断并杀掉进程，防止死循环打印把面板撑爆 */
const MAX_STDOUT_LINES = 1000;
const MAX_STDERR_CHARS = 50_000;

const running = new Set<ChildProcess>();

export function runBinary(binPath: string, input: string, timeoutMs: number): Promise<Run> {
    const result: Run = { stdout: '', stderr: '', code: null, signal: null, time: 0, timeOut: false };

    return new Promise((resolve) => {
        const begin = Date.now();
        const child = spawn(binPath, [], { env: { ...process.env, DEBUG: 'true' } });
        running.add(child);

        let settled = false;
        const finish = (): void => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(killer);
            running.delete(child);
            result.time = Date.now() - begin;
            resolve(result);
        };

        const killer = setTimeout(() => {
            result.timeOut = true;
            child.kill();
        }, timeoutMs);

        let lines = 0;
        let truncated = false;
        child.stdout.on('data', (chunk: Buffer) => {
            if (truncated) {
                return;
            }
            const text = chunk.toString();
            const newLines = text.split('\n').length - 1;
            if (lines + newLines > MAX_STDOUT_LINES) {
                const keep = text.split('\n').slice(0, MAX_STDOUT_LINES - lines).join('\n');
                result.stdout += `${keep}\n... [输出超过 ${MAX_STDOUT_LINES} 行，已截断]`;
                truncated = true;
                child.kill();
                return;
            }
            result.stdout += text;
            lines += newLines;
        });

        child.stderr.on('data', (chunk: Buffer) => {
            if (result.stderr.length < MAX_STDERR_CHARS) {
                result.stderr += chunk;
            }
        });

        child.on('exit', (code, signal) => {
            result.code = code;
            result.signal = signal;
            finish();
        });

        // 二进制不存在、无执行权限等：exit 不会触发，按失败处理
        child.on('error', (err) => {
            result.code = 1;
            result.signal = err.name;
            result.stderr ||= err.message;
            finish();
        });

        child.stdin.on('error', () => {
            // 程序没读完输入就退出时 stdin 会报 EPIPE，忽略即可
        });
        child.stdin.end(input);
    });
}

/** 停止所有正在运行的用例进程；通常同一时刻只有一个 */
export function killRunning(): void {
    for (const child of running) {
        try {
            child.kill();
        } catch {
            // 进程可能已经退出
        }
    }
    running.clear();
}

export function deleteBinary(binPath: string): void {
    unlink(binPath, () => {
        // 编译失败时文件本来就不存在，忽略错误
    });
}
