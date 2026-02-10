/**
 * Competitive Companion 集成模块
 * 监听 HTTP POST 请求，接收从浏览器扩展发送的题目数据
 * 
 * 文件生成规则 (与根目录 gen.go 保持一致):
 * - Codeforces: cf/{区间}/{比赛ID}/{题目ID}_{题目名}/main.go
 *   例如: cf/1800_2000/1992/A_Only_Pluses/main.go
 * - AtCoder: atcoder/{比赛名}/{题目名}/main.go
 *   例如: atcoder/abc347/A_Divisible/main.go
 * - 其他: others/{题目名}/main.go
 */

import * as http from 'http';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Problem, TestCase } from '../common/types';
import { getJudgeViewProvider } from '../common/shared';
import { randomId } from '../utils/utils';
import { getCompanionPortPref } from '../common/preferences';
import { generatePaths } from '../core/pathGenerator';
import { generateMainGo, generateTestGo } from '../core/templateGenerator';

let server: http.Server | null = null;

interface CompanionProblem {
    name: string;
    group: string;
    url: string;
    interactive: boolean;
    memoryLimit: number;
    timeLimit: number;
    tests: Array<{ input: string; output: string }>;
}

// ================================ File Operations ================================

function ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

/**
 * 查找下一个可用的目录名 (带 _idx 后缀)
 */
function findNextAvailablePath(basePath: string): string {
    let idx = 2;
    let newPath = `${basePath}_${idx}`;
    while (fs.existsSync(newPath)) {
        idx++;
        newPath = `${basePath}_${idx}`;
    }
    return newPath;
}

/**
 * 处理文件已存在的情况，弹出选择对话框
 * 返回: 最终使用的路径，或 null 表示取消
 */
async function handleExistingFiles(paths: { dirPath: string; srcPath: string; testPath: string }): Promise<{ dirPath: string; srcPath: string; testPath: string } | null> {
    // 检查目录或文件是否存在
    const dirExists = fs.existsSync(paths.dirPath);
    const srcExists = fs.existsSync(paths.srcPath);

    if (!dirExists && !srcExists) {
        return paths; // 不存在，直接使用
    }

    const folderName = path.basename(paths.dirPath);
    const choice = await vscode.window.showWarningMessage(
        `文件夹 "${folderName}" 已存在，请选择操作：`,
        { modal: true },
        '覆盖',
        '新增'
    );

    if (!choice) {
        return null; // 取消
    }

    if (choice === '覆盖') {
        return paths; // 覆盖现有文件
    }

    if (choice === '新增') {
        const newDirPath = findNextAvailablePath(paths.dirPath);
        return {
            dirPath: newDirPath,
            srcPath: path.join(newDirPath, 'main.go'),
            testPath: path.join(newDirPath, 'main_test.go'),
        };
    }

    return null;
}

// ================================ Problem Handler ================================

async function handleProblem(data: CompanionProblem): Promise<void> {
    globalThis.logger.log('收到 Competitive Companion 数据:', data.name, data.url);

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        await vscode.commands.executeCommand('gocph.judgeView.focus');
        getJudgeViewProvider().extensionToJudgeViewMessage({
            command: 'notification',
            text: '请先打开一个工作区文件夹',
            type: 'error',
        });
        return;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    let paths = generatePaths(workspaceRoot, data.url, data.name);

    if (!paths) {
        await vscode.commands.executeCommand('gocph.judgeView.focus');
        getJudgeViewProvider().extensionToJudgeViewMessage({
            command: 'notification',
            text: '无法解析题目 URL',
            type: 'error',
        });
        return;
    }

    // 处理文件已存在的情况
    const finalPaths = await handleExistingFiles(paths);
    if (!finalPaths) {
        globalThis.logger.log('用户取消操作');
        return;
    }
    paths = finalPaths;

    globalThis.logger.log('生成目录:', paths.dirPath);

    // 创建目录
    ensureDir(paths.dirPath);

    // 创建 main.go (覆盖或新建)
    fs.writeFileSync(paths.srcPath, generateMainGo(data.url));
    globalThis.logger.log('创建源文件:', paths.srcPath);

    // 创建 main_test.go (覆盖或新建)
    fs.writeFileSync(paths.testPath, generateTestGo({
        name: data.name,
        group: data.group,
        url: data.url,
        tests: data.tests,
    }));
    globalThis.logger.log('创建测试文件:', paths.testPath);

    // 转换测试用例格式 (用于 webview)
    const tests: TestCase[] = data.tests.map((test, index) => ({
        input: test.input,
        output: test.output,
        id: randomId(index),
    }));

    // 创建 Problem 对象 (test 文件已包含所有数据，无需额外保存)
    const problem: Problem = {
        name: data.name,
        url: data.url,
        interactive: data.interactive,
        memoryLimit: data.memoryLimit,
        timeLimit: data.timeLimit,
        group: data.group,
        tests,
        srcPath: paths.srcPath,
    };

    // 打开源文件
    const document = await vscode.workspace.openTextDocument(paths.srcPath);
    await vscode.window.showTextDocument(document);

    // 显示 Judge 面板
    await vscode.commands.executeCommand('gocph.judgeView.focus');

    // 发送问题到 webview
    getJudgeViewProvider().extensionToJudgeViewMessage({
        command: 'new-problem',
        problem,
    });

    const folderName = path.basename(paths.dirPath);
    getJudgeViewProvider().extensionToJudgeViewMessage({
        command: 'notification',
        text: `已加载: ${folderName}`,
        type: 'success',
    });
}

// ================================ Server ================================

export function startCompanionServer(): void {
    if (server) {
        globalThis.logger.log('Companion 服务器已在运行');
        return;
    }

    const port = getCompanionPortPref();

    server = http.createServer((req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        if (req.method === 'POST' && req.url === '/') {
            let body = '';
            req.on('data', (chunk) => { body += chunk.toString(); });
            req.on('end', async () => {
                try {
                    const data: CompanionProblem = JSON.parse(body);
                    await handleProblem(data);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'ok' }));
                } catch (error) {
                    globalThis.logger.error('处理 Companion 数据失败:', error);
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid data' }));
                }
            });
        } else {
            res.writeHead(404);
            res.end();
        }
    });

    server.listen(port, '127.0.0.1', () => {
        globalThis.logger.log(`Competitive Companion 服务器已启动，监听端口 ${port}`);
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
            globalThis.logger.warn(`端口 ${port} 已被占用`);
        } else {
            globalThis.logger.error('Companion 服务器错误:', err);
        }
    });
}

export function stopCompanionServer(): void {
    if (server) {
        server.close(() => {
            globalThis.logger.log('Competitive Companion 服务器已停止');
        });
        server = null;
    }
}
