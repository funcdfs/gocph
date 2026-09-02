import { randomBytes } from 'crypto';
import * as vscode from 'vscode';
import type { HostMessage, NotificationType, WebviewMessage } from '../../shared/protocol';
import { logger } from '../logger';

export type WebviewMessageHandler = (message: WebviewMessage) => Promise<void> | void;

/**
 * 侧边栏结果面板的宿主端：负责 HTML、消息收发与缓冲，不含业务逻辑。
 *
 * 面板隐藏时 webview 会被销毁（retainContextWhenHidden = false），再次显示后
 * webview 会发 get-initial-problem 重新同步。因此 new-problem 从不缓冲（届时会重算），
 * 其余消息（运行结果等）缓冲到那时再回放。
 */
export class JudgePanel implements vscode.WebviewViewProvider {
    static readonly viewType = 'gocph.judgeView';

    private view?: vscode.WebviewView;
    private buffer: HostMessage[] = [];
    private handler: WebviewMessageHandler = () => undefined;

    constructor(private readonly extensionUri: vscode.Uri) {}

    onMessage(handler: WebviewMessageHandler): void {
        this.handler = handler;
    }

    resolveWebviewView(view: vscode.WebviewView): void {
        this.view = view;
        view.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'dist')],
        };
        view.webview.html = this.html(view.webview);
        view.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
            logger.log('webview →', message.command);
            try {
                await this.handler(message);
            } catch (err) {
                logger.error('处理 webview 消息失败', message.command, err);
                this.notify('操作失败，详情见开发者控制台', 'error');
            }
        });
    }

    /** 面板从未被打开过（用户还没点过侧边栏图标） */
    isUnresolved(): boolean {
        return this.view === undefined;
    }

    /** 显示面板但不抢编辑器焦点 */
    async focus(): Promise<void> {
        if (this.view) {
            this.view.show(true);
        } else {
            await vscode.commands.executeCommand(`${JudgePanel.viewType}.focus`);
        }
    }

    post(message: HostMessage): void {
        if (this.view?.visible) {
            void this.view.webview.postMessage(message);
            return;
        }
        if (message.command === 'new-problem') {
            this.buffer = [];
            return;
        }
        this.buffer.push(message);
    }

    /** webview 挂载并请求初始数据后，回放隐藏期间累积的消息 */
    flush(): void {
        const pending = this.buffer;
        this.buffer = [];
        for (const message of pending) {
            void this.view?.webview.postMessage(message);
        }
    }

    notify(text: string, type: NotificationType = 'info'): void {
        this.post({ command: 'notification', text, type });
    }

    private html(webview: vscode.Webview): string {
        const nonce = randomBytes(16).toString('hex');
        const asset = (name: string): vscode.Uri =>
            webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'dist', name));
        const csp = [
            `default-src 'none'`,
            `style-src ${webview.cspSource} 'unsafe-inline'`,
            `script-src 'nonce-${nonce}'`,
            `font-src ${webview.cspSource}`,
            `img-src ${webview.cspSource} data:`,
        ].join('; ');

        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="${asset('webview.css')}" />
</head>
<body>
    <div id="app"></div>
    <script nonce="${nonce}" src="${asset('webview.js')}"></script>
</body>
</html>`;
    }
}
