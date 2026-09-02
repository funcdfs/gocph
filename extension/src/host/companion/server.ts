/**
 * Competitive Companion 集成：本地 HTTP 服务接收浏览器扩展发来的题目，
 * 按 problem/layout 的规则建目录、写 main.go 与 main_test.go，然后在编辑器里打开。
 */
import * as http from 'http';
import * as path from 'path';
import * as vscode from 'vscode';
import type { ActiveFileTracker } from '../editor/activeFile';
import { logger } from '../logger';
import type { JudgePanel } from '../panel/JudgePanel';
import { dirExists, nextAvailableDir, writeProblemFiles } from '../problem/create';
import { problemDirAt, problemDirFor, type ProblemDir } from '../problem/layout';
import { settings } from '../settings';
import { showDocument, workspaceRoot } from '../workspace';

interface CompanionPayload {
    name: string;
    group?: string;
    url: string;
    tests: Array<{ input: string; output: string }>;
}

export interface CompanionDeps {
    panel: JudgePanel;
    activeFile: ActiveFileTracker;
}

function isPayload(data: unknown): data is CompanionPayload {
    const d = data as Partial<CompanionPayload> | null;
    return (
        typeof d === 'object' &&
        d !== null &&
        typeof d.name === 'string' &&
        typeof d.url === 'string' &&
        Array.isArray(d.tests)
    );
}

export function startCompanionServer(deps: CompanionDeps): vscode.Disposable {
    const port = settings.companionPort();

    const server = http.createServer((req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(200).end();
            return;
        }
        if (req.method !== 'POST' || req.url !== '/') {
            res.writeHead(404).end();
            return;
        }

        let body = '';
        req.on('data', (chunk) => {
            body += chunk;
        });
        req.on('end', async () => {
            try {
                const data: unknown = JSON.parse(body);
                if (!isPayload(data)) {
                    throw new Error('payload 缺少 name / url / tests');
                }
                await handleProblem(data, deps);
                res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ status: 'ok' }));
            } catch (err) {
                logger.error('处理 Companion 数据失败', err);
                res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Invalid data' }));
            }
        });
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
            logger.warn(`Companion 端口 ${port} 已被占用，可能有另一个窗口在监听`);
        } else {
            logger.error('Companion 服务器错误', err);
        }
    });
    server.listen(port, '127.0.0.1', () => logger.log(`Companion 服务器监听 ${port}`));

    return new vscode.Disposable(() => server.close());
}

async function handleProblem(data: CompanionPayload, { panel, activeFile }: CompanionDeps): Promise<void> {
    logger.log('收到 Companion 题目', data.name, data.url);

    const root = workspaceRoot();
    if (!root) {
        await panel.focus();
        panel.notify('请先打开一个工作区文件夹', 'error');
        return;
    }

    const dir = await resolveTargetDir(problemDirFor(root, data.url, data.name));
    if (!dir) {
        logger.log('用户取消建题');
        return;
    }

    writeProblemFiles(dir, { name: data.name, group: data.group ?? '', url: data.url, tests: data.tests });
    logger.log('已生成题目目录', dir.dirPath);

    await showDocument(dir.srcPath);
    await panel.focus();
    activeFile.refresh();
    panel.notify(`已加载: ${path.basename(dir.dirPath)}`, 'success');
}

/** 目录已存在时让用户选择覆盖还是另建 _2、_3… 目录；取消返回 undefined */
async function resolveTargetDir(dir: ProblemDir): Promise<ProblemDir | undefined> {
    if (!dirExists(dir)) {
        return dir;
    }
    const choice = await vscode.window.showWarningMessage(
        `文件夹 "${path.basename(dir.dirPath)}" 已存在，请选择操作：`,
        { modal: true },
        '覆盖',
        '新增',
    );
    if (choice === '覆盖') {
        return dir;
    }
    if (choice === '新增') {
        return problemDirAt(nextAvailableDir(dir.dirPath));
    }
    return undefined;
}
