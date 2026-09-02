/**
 * 命令面板 / 快捷键入口：runAllTests (Alt+1)、stopTests (Alt+2)、copyCode (Alt+3)
 */
import * as vscode from 'vscode';
import type { ActiveFileTracker } from './editor/activeFile';
import type { JudgeSession } from './judge/session';
import { logger } from './logger';
import type { JudgePanel } from './panel/JudgePanel';
import { createTestFileFor } from './problem/create';
import { fileStatusOf, problemPathsOf } from './problem/layout';
import { readProblem } from './problem/testFile';

export interface CommandDeps {
    panel: JudgePanel;
    session: JudgeSession;
    activeFile: ActiveFileTracker;
}

export function registerCommands(deps: CommandDeps): vscode.Disposable[] {
    const { panel, session } = deps;
    return [
        vscode.commands.registerCommand('gocph.runAllTests', () => runActiveFile(deps)),

        vscode.commands.registerCommand('gocph.stopTests', () => {
            session.stop();
            panel.notify('已请求停止运行测试', 'info');
        }),

        vscode.commands.registerCommand('gocph.copyCode', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return;
            }
            await vscode.env.clipboard.writeText(editor.document.getText());
            panel.notify('代码已复制到剪贴板', 'success');
        }),
    ];
}

/**
 * 运行当前文件的全部用例。在 main.go 或 main_test.go 里按都可以；
 * 还没有用例文件时先按模板补一个空用例，交给面板编辑而不运行。
 */
async function runActiveFile({ panel, session, activeFile }: CommandDeps): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    const filePath = editor.document.fileName;
    if (fileStatusOf(filePath) === 'not-allowed') {
        await panel.focus();
        panel.notify('只支持题目目录（cf / atcoder / void …）下的 .go 文件', 'error');
        return;
    }

    const { srcPath, testPath } = problemPathsOf(filePath);
    const problem = readProblem(srcPath);
    if (!problem) {
        if (createTestFileFor(srcPath)) {
            logger.log('补建用例文件', testPath);
            await panel.focus();
            activeFile.refresh();
        } else {
            await panel.focus();
            panel.notify('main_test.go 不是 GoCPH 生成的格式，无法读取用例', 'error');
        }
        return;
    }

    await panel.focus();
    panel.post({ command: 'new-problem', problem, fileStatus: 'valid', mainFilePath: srcPath, testFilePath: testPath });
    await session.runAll(problem);
}
