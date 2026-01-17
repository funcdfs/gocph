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
};

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
        'GoCPH - 运行所有测试用例 (Ctrl+Shift+R)';
    statusBarItem.show();
    statusBarItem.command = 'gocph.runAllTests';
    context.subscriptions.push(statusBarItem);

    registerCommands(context);
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
    
    globalThis.logger.log('gocph: deactivate() completed');
}
