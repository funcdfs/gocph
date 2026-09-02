/**
 * 组合根：创建各模块并接线，自身不包含业务逻辑。
 *
 * 依赖方向（eslint 强制）：
 *   webview ──┐
 *             ├─► shared（协议 + 领域类型）
 *   host ─────┘
 *   host/problem、host/judge/{compile,run,compare} 不依赖 vscode，只返回数据；
 *   只有 panel / commands / companion / editor / judge/session 这些应用层模块才碰面板与编辑器。
 */
import * as vscode from 'vscode';
import { registerCommands } from './host/commands';
import { startCompanionServer } from './host/companion/server';
import { ActiveFileTracker } from './host/editor/activeFile';
import { registerAutoFold } from './host/editor/autoFold';
import { registerRegionFolding } from './host/editor/folding';
import { RecentFiles } from './host/editor/recentFiles';
import { JudgeSession } from './host/judge/session';
import { logger } from './host/logger';
import { compileOutput } from './host/outputChannel';
import { createMessageHandler } from './host/panel/handlers';
import { JudgePanel } from './host/panel/JudgePanel';

export function activate(context: vscode.ExtensionContext): void {
    logger.log('activate');

    const panel = new JudgePanel(context.extensionUri);
    const session = new JudgeSession(panel);
    const activeFile = new ActiveFileTracker(panel, new RecentFiles(context.globalState));
    panel.onMessage(createMessageHandler({ panel, session, activeFile }));

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(JudgePanel.viewType, panel),
        ...registerCommands({ panel, session, activeFile }),
        ...activeFile.register(),
        registerRegionFolding(),
        registerAutoFold(),
        startCompanionServer({ panel, activeFile }),
        createStatusBarItem(),
        compileOutput,
    );

    activeFile.refresh();
    logger.log('activate done');
}

export function deactivate(): void {
    logger.log('deactivate');
}

function createStatusBarItem(): vscode.StatusBarItem {
    const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1000);
    item.text = '$(run-all) 运行测试';
    item.tooltip = 'GoCPH: 运行所有测试用例 (Alt+1)';
    item.command = 'gocph.runAllTests';
    item.show();
    return item;
}
