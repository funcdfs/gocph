/**
 * 初始化全局日志记录器
 */
function initializeLogger() {
    globalThis.storedLogs = '';

    function customLogger(
        originalMethod: (...args: unknown[]) => void,
        ...args: unknown[]
    ) {
        originalMethod(...args);

        globalThis.storedLogs += new Date().toISOString() + ' ';
        globalThis.storedLogs +=
            args
                .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg))
                .join(' ') + '\n';
    }

    globalThis.logger = {
        log: (...args: unknown[]) => customLogger(console.log, ...args),
        error: (...args: unknown[]) => customLogger(console.error, ...args),
        warn: (...args: unknown[]) => customLogger(console.warn, ...args),
        info: (...args: unknown[]) => customLogger(console.info, ...args),
        debug: (...args: unknown[]) => customLogger(console.debug, ...args),
    };
}

// 在模块加载时初始化 logger，确保其他模块可以使用
initializeLogger();

import * as vscode from 'vscode';
import runTestCases from './runTestCases';
import {
    editorChanged,
    editorClosed,
    checkLaunchWebview,
} from './webview/editorChange';
import JudgeViewProvider from './webview/JudgeView';
import { getRetainWebviewContextPref } from './preferences';
import { startCompanionServer, stopCompanionServer } from './companion';
import { requestCancellation } from './executions';

let judgeViewProvider: JudgeViewProvider;
let statusBarItem: vscode.StatusBarItem | undefined;

export const getJudgeViewProvider = () => {
    return judgeViewProvider;
};

const registerCommands = (context: vscode.ExtensionContext) => {
    globalThis.logger.log('Registering commands');

    // 注册运行所有测试命令
    const runAllDisposable = vscode.commands.registerCommand(
        'gocph.runAllTests',
        () => {
            runTestCases();
        },
    );

    judgeViewProvider = new JudgeViewProvider(context.extensionUri);

    const webviewView = vscode.window.registerWebviewViewProvider(
        JudgeViewProvider.viewType,
        judgeViewProvider,
        {
            webviewOptions: {
                retainContextWhenHidden: getRetainWebviewContextPref(),
            },
        },
    );

    context.subscriptions.push(webviewView);
    context.subscriptions.push(runAllDisposable);

    // 注册停止测试命令
    const stopDisposable = vscode.commands.registerCommand(
        'gocph.stopTests',
        () => {
            requestCancellation();
            judgeViewProvider.extensionToJudgeViewMessage({
                command: 'notification',
                text: 'GoCPH: 已请求停止运行测试',
                type: 'info',
            });
        },
    );
    context.subscriptions.push(stopDisposable);

    // 注册折叠 Region 命令 - 手动实现查找并折叠 #region 标记
    const foldDisposable = vscode.commands.registerCommand(
        'gocph.foldAllRegions',
        async () => {
            const foldedCount = await foldRegionsInActiveEditor();

            if (foldedCount === 0) {
                judgeViewProvider.extensionToJudgeViewMessage({
                    command: 'notification',
                    text: 'GoCPH: 未找到 #region 标记',
                    type: 'info',
                });
            } else {
                judgeViewProvider.extensionToJudgeViewMessage({
                    command: 'notification',
                    text: `GoCPH: 已切换 ${foldedCount} 个 region 的折叠状态`,
                    type: 'success',
                });
            }
        },
    );
    context.subscriptions.push(foldDisposable);

    // 注册复制代码命令
    const copyDisposable = vscode.commands.registerCommand(
        'gocph.copyCode',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const text = editor.document.getText();
                await vscode.env.clipboard.writeText(text);
                judgeViewProvider.extensionToJudgeViewMessage({
                    command: 'notification',
                    text: 'GoCPH: 代码已复制到剪贴板',
                    type: 'success',
                });
            }
        },
    );
    context.subscriptions.push(copyDisposable);
};

// 公共折叠函数，供内外部调用
export async function foldRegionsInActiveEditor(): Promise<number> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return 0;
    }

    const document = editor.document;
    const text = document.getText();
    const lines = text.split('\n');

    // 只在前 10 行中查找 #region 开始行（优化：代码格式固定）
    const regionStartLines: number[] = [];
    const searchLimit = Math.min(20, lines.length); // 稍微增加搜索范围
    for (let i = 0; i < searchLimit; i++) {
        const line = lines[i].trim();
        if (line.startsWith('// #region') || line.startsWith('//#region')) {
            regionStartLines.push(i);
        }
    }

    if (regionStartLines.length === 0) {
        return 0;
    }

    // 为每个 region 起始行创建 Selection，然后折叠
    // 使用 editor.fold 命令，它会折叠光标所在行的代码块
    const originalSelections = editor.selections;

    // 创建所有 region 起始行的 selections
    const regionSelections = regionStartLines.map(
        (line) => new vscode.Selection(line, 0, line, 0)
    );

    // 设置光标到所有 region 起始行
    editor.selections = regionSelections;

    // 执行折叠/展开命令
    await vscode.commands.executeCommand('editor.toggleFold');

    // 恢复原始光标位置
    editor.selections = originalSelections;

    return regionStartLines.length;
}

// 监听文档变化，检测 snippet 插入后自动折叠
let foldTimeout: NodeJS.Timeout | undefined;
const snippetPatterns = ['// #region main', '//#region main'];

function setupSnippetListener(context: vscode.ExtensionContext) {
    const changeDisposable = vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.languageId !== 'go') {
            return;
        }

        // 简单检测：如果文档内容包含特定 region 标记，且似乎是刚插入的（这里简化处理，不做严格 diff）
        // 对于 snippet 触发，用户通常是一次性插入大段代码
        // 我们通过延时 debounce 来避免频繁触发
        for (const change of e.contentChanges) {
            // 性能优化：只检测前 20 行的变更，且插入文本长度需超过 10 字符
            // 这能过滤掉大部分普通输入和非头部编辑
            if (change.range.start.line >= 20 || change.text.length < 10) {
                continue;
            }

            // 如果插入的内容中包含标记
            const hasRegion = snippetPatterns.some(p => change.text.includes(p));
            if (hasRegion) {
                if (foldTimeout) {
                    clearTimeout(foldTimeout);
                }
                // 延迟 1s 折叠
                foldTimeout = setTimeout(() => {
                    foldRegionsInActiveEditor();
                }, 1000);
                break;
            }
        }
    });
    context.subscriptions.push(changeDisposable);
}

// This method is called when the extension is activated
export function activate(context: vscode.ExtensionContext) {
    globalThis.logger.log('gocph: activate() execution started');
    globalThis.context = context;

    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        1000,
    );
    statusBarItem.text = ' $(run-all)  运行测试';
    statusBarItem.tooltip =
        'GoCPH - 运行所有测试用例 (Option+1)'; // 更新快捷键提示
    statusBarItem.show();
    statusBarItem.command = 'gocph.runAllTests';
    context.subscriptions.push(statusBarItem);

    registerCommands(context);
    setupSnippetListener(context); // 注册监听器
    checkLaunchWebview();

    // 启动 Competitive Companion 服务器
    startCompanionServer();

    const closeDocDisposable = vscode.workspace.onDidCloseTextDocument((e) => {
        editorClosed(e);
    });
    context.subscriptions.push(closeDocDisposable);

    const changeEditorDisposable = vscode.window.onDidChangeActiveTextEditor((e) => {
        editorChanged(e);
    });
    context.subscriptions.push(changeEditorDisposable);

    const visibleEditorsDisposable = vscode.window.onDidChangeVisibleTextEditors((editors) => {
        if (editors.length === 0) {
            getJudgeViewProvider().extensionToJudgeViewMessage({
                command: 'new-problem',
                problem: undefined,
            });
        }
    });
    context.subscriptions.push(visibleEditorsDisposable);

    globalThis.logger.log('gocph: activate() completed');
    return;
}

// This method is called when the extension is deactivated
export function deactivate() {
    globalThis.logger.log('gocph: deactivate() called');

    // 停止 Competitive Companion 服务器
    stopCompanionServer();

    // 清理状态栏项
    if (statusBarItem) {
        statusBarItem.dispose();
        statusBarItem = undefined;
    }

    if (foldTimeout) {
        clearTimeout(foldTimeout);
    }

    globalThis.logger.log('gocph: deactivate() completed');
}
