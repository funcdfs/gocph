import * as vscode from 'vscode';
import { killRunning } from '../executions';
import { saveProblem } from '../parser';
import { VSToWebViewMessage, WebviewToVSEvent } from '../types';
import { deleteProblemFile, getNonce, getProblemForDocument, getFileStatus, getMainFileFromTestFile } from '../utils';
import { getTestFilePath } from '../testFileParser';
import { runSingleAndSave } from './processRunSingle';
import runAllAndSave from './processRunAll';
import runTestCases from '../runTestCases';
import { getAutoShowJudgePref, getRetainWebviewContextPref } from '../preferences';

class JudgeViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'gocph.judgeView';

    private _view?: vscode.WebviewView;

    private messageBuffer: VSToWebViewMessage[] = [];

    public isViewUninitialized() {
        return this._view === undefined;
    }

    constructor(private readonly _extensionUri: vscode.Uri) { }

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(
            async (message: WebviewToVSEvent) => {
                globalThis.logger.log('Got from webview', message);
                try {
                    switch (message.command) {
                        case 'run-single-and-save': {
                            const problem = message.problem;
                            const id = message.id;
                            runSingleAndSave(problem, id);
                            break;
                        }

                        case 'run-all-and-save': {
                            const problem = message.problem;
                            runAllAndSave(problem);
                            break;
                        }

                        case 'save': {
                            saveProblem(message.problem.srcPath, message.problem);
                            break;
                        }

                        case 'kill-running': {
                            killRunning();
                            break;
                        }

                        case 'delete-tcs': {
                            this.extensionToJudgeViewMessage({
                                command: 'new-problem',
                                problem: undefined,
                            });
                            await deleteProblemFile(message.problem.srcPath);
                            break;
                        }

                        case 'get-initial-problem': {
                            this.getInitialProblem();
                            break;
                        }

                        case 'create-local-problem': {
                            runTestCases();
                            break;
                        }

                        case 'open-file': {
                            const filePath = message.filePath;
                            const document = await vscode.workspace.openTextDocument(filePath);
                            await vscode.window.showTextDocument(document);
                            break;
                        }

                        case 'copy-main-go': {
                            const problem = message.problem;
                            if (problem && problem.srcPath) {
                                try {
                                    const document = await vscode.workspace.openTextDocument(problem.srcPath);
                                    const text = document.getText();
                                    await vscode.env.clipboard.writeText(text);
                                    this.extensionToJudgeViewMessage({
                                        command: 'notification',
                                        text: '代码已复制到剪贴板',
                                        type: 'success',
                                    });
                                } catch (e) {
                                    globalThis.logger.error('复制 main.go 内容失败', e);
                                    this.extensionToJudgeViewMessage({
                                        command: 'notification',
                                        text: '复制失败，请重试',
                                        type: 'error',
                                    });
                                }
                            }
                            break;
                        }

                        default: {
                            globalThis.logger.error(
                                'Unknown event received from webview',
                                message,
                            );
                            break;
                        }
                    }
                } catch (error) {
                    globalThis.logger.error('处理 Webview 消息时出错', error, message);
                    vscode.window.showErrorMessage(
                        '操作失败，请查看输出面板获取详情。'
                    );
                }
            },
        );
    }

    private getInitialProblem() {
        const doc = vscode.window.activeTextEditor?.document;
        const fileStatus = getFileStatus(doc);
        const srcPath = doc?.fileName;

        let mainFilePath: string | undefined;
        let testFilePath: string | undefined;

        if (srcPath) {
            if (fileStatus === 'is-test-file') {
                mainFilePath = getMainFileFromTestFile(srcPath);
                testFilePath = srcPath;
            } else if (fileStatus === 'valid') {
                mainFilePath = srcPath;
                testFilePath = getTestFilePath(srcPath);
            }
        }

        this.extensionToJudgeViewMessage({
            command: 'new-problem',
            problem: getProblemForDocument(doc),
            fileStatus,
            mainFilePath,
            testFilePath,
        });

        this.messageBuffer.forEach((message) => {
            globalThis.logger.log('Restored buffer command', message.command);
            this._view?.webview.postMessage(message);
        });

        this.messageBuffer = [];

        return;
    }

    public problemPath: string | undefined;

    public async focus() {
        globalThis.logger.log('focusing');
        if (!this._view) {
            await vscode.commands.executeCommand('gocph.judgeView.focus');
        } else {
            this._view.show?.(true);
        }
    }

    private focusIfNeeded = (message: VSToWebViewMessage) => {
        globalThis.logger.log(message.command);

        switch (message.command) {
            case 'compiling-start':
            case 'run-all': {
                this.focus();
            }
        }

        if (
            message.command === 'new-problem' &&
            message.problem !== undefined &&
            getAutoShowJudgePref()
        ) {
            this.focus();
        }
    };

    public extensionToJudgeViewMessage = async (
        message: VSToWebViewMessage,
    ) => {
        this.focusIfNeeded(message);
        if (
            (this._view && this._view.visible) ||
            (this._view && getRetainWebviewContextPref())
        ) {
            this._view.webview.postMessage(message);
            globalThis.logger.log('View got message', message);
            if (message.command === 'new-problem') {
                if (message.problem === undefined) {
                    this.problemPath = undefined;
                } else {
                    this.problemPath = message.problem.srcPath;
                }
            }
        } else {
            if (message.command !== 'new-problem') {
                globalThis.logger.log('Pushing to buffer', message.command);
                this.messageBuffer.push(message);
            } else {
                this.messageBuffer = [];
            }
        }
    };

    private _getHtmlForWebview(webview: vscode.Webview) {
        const nonce = getNonce();

        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'dist', 'app.css'),
        );

        const codiconsUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'dist', 'codicon.css'),
        );

        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(
                this._extensionUri,
                'dist',
                'frontend.module.js',
            ),
        );

        // Content Security Policy 配置
        const csp = [
            `default-src 'none'`,
            `style-src ${webview.cspSource} 'unsafe-inline'`,
            `script-src 'nonce-${nonce}'`,
            `font-src ${webview.cspSource}`,
            `img-src ${webview.cspSource} data:`,
        ].join('; ');

        const html = `
            <!DOCTYPE html>
            <html lang="zh-CN">
                <head>
                    <meta charset="UTF-8" />
                    <meta http-equiv="Content-Security-Policy" content="${csp}" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <link rel="stylesheet" href="${styleUri}" />
                    <link rel="stylesheet" href="${codiconsUri}" />
                </head>
                <body>
                    <div id="app"></div>
                    <script nonce="${nonce}">
                        window.vscodeApi = acquireVsCodeApi();
                    </script>
                    <script nonce="${nonce}" src="${scriptUri}"></script>
                </body>
            </html>
        `;

        return html;
    }
}

export default JudgeViewProvider;
