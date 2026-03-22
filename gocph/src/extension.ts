import './common/logger';

import * as vscode from 'vscode';
import runTestCases from './commands/runTestCases';
import {
    editorChanged,
    editorClosed,
    checkLaunchWebview,
} from './webview/editorChange';
import JudgeViewProvider from './webview/JudgeView';
import { getRetainWebviewContextPref } from './common/preferences';
import { startCompanionServer, stopCompanionServer } from './services/companion';
import { requestCancellation } from './core/executions';
import { setJudgeViewProvider, getJudgeViewProvider } from './common/shared';
import { setupAutoFold } from './core/autoFold';

let judgeViewProvider: JudgeViewProvider;
let statusBarItem: vscode.StatusBarItem | undefined;

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
    setJudgeViewProvider(judgeViewProvider); // 设置全局引用

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
    checkLaunchWebview();
    setupAutoFold(context);

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
