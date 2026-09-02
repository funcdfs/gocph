/**
 * webview → 主进程的消息分发。每个分支只做接线，具体工作交给对应模块。
 */
import * as path from 'path';
import * as vscode from 'vscode';
import type { WebviewMessage } from '../../shared/protocol';
import type { ActiveFileTracker } from '../editor/activeFile';
import type { JudgeSession } from '../judge/session';
import { logger } from '../logger';
import { createVoidProblem } from '../problem/create';
import { writeProblem } from '../problem/testFile';
import { readDocumentText, showDocument, workspaceRoot } from '../workspace';
import type { JudgePanel, WebviewMessageHandler } from './JudgePanel';

export interface HandlerDeps {
    panel: JudgePanel;
    session: JudgeSession;
    activeFile: ActiveFileTracker;
}

export function createMessageHandler({ panel, session, activeFile }: HandlerDeps): WebviewMessageHandler {
    return async (message: WebviewMessage): Promise<void> => {
        switch (message.command) {
            case 'get-initial-problem':
                activeFile.refresh();
                panel.flush();
                return;

            case 'run-all-and-save':
                await session.runAll(message.problem);
                return;

            case 'run-single-and-save':
                await session.runSingle(message.problem, message.id);
                return;

            case 'kill-running':
                session.stop();
                return;

            case 'save':
                writeProblem(message.problem);
                return;

            case 'open-file':
                await showDocument(message.filePath);
                return;

            case 'copy-main-go':
                await vscode.env.clipboard.writeText(await readDocumentText(message.srcPath));
                panel.notify('代码已复制到剪贴板', 'success');
                return;

            case 'create-void': {
                const root = workspaceRoot();
                if (!root) {
                    panel.notify('请先打开一个工作区文件夹', 'error');
                    return;
                }
                const dir = createVoidProblem(root);
                logger.log('创建 void 题目', dir.dirPath);
                await showDocument(dir.srcPath);
                activeFile.refresh();
                panel.notify(`已创建 void/${path.basename(dir.dirPath)}`, 'success');
                return;
            }
        }
    };
}
