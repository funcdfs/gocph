import * as vscode from 'vscode';
import type { JudgePanel } from '../panel/JudgePanel';
import { fileStatusOf, problemPathsOf } from '../problem/layout';
import { readProblem } from '../problem/testFile';
import { settings } from '../settings';
import type { RecentFiles } from './recentFiles';

/**
 * 跟随活动编辑器：把当前文件对应的题目（或空状态）推给面板。
 * 面板展示什么，只由「当前活动编辑器是哪个文件」决定，这是唯一的数据来源。
 */
export class ActiveFileTracker {
    constructor(
        private readonly panel: JudgePanel,
        private readonly recent: RecentFiles,
    ) {}

    register(): vscode.Disposable[] {
        return [vscode.window.onDidChangeActiveTextEditor((editor) => this.sync(editor))];
    }

    /** 按当前活动编辑器重新推送一次；面板初始化、建题之后调用 */
    refresh(): void {
        this.sync(vscode.window.activeTextEditor);
    }

    private sync(editor: vscode.TextEditor | undefined): void {
        if (!editor) {
            this.panel.post({ command: 'new-problem', problem: undefined, fileStatus: 'no-file', recentFiles: this.recent.list() });
            return;
        }
        // 输出面板、diff 视图等虚拟文档不改变面板内容
        if (editor.document.uri.scheme !== 'file') {
            return;
        }

        const filePath = editor.document.fileName;
        const fileStatus = fileStatusOf(filePath);
        if (fileStatus === 'not-allowed') {
            this.panel.post({ command: 'new-problem', problem: undefined, fileStatus, recentFiles: this.recent.list() });
            return;
        }

        const { srcPath, testPath } = problemPathsOf(filePath);
        this.recent.touch(srcPath);
        const problem = fileStatus === 'valid' ? readProblem(srcPath) : undefined;

        // 单击预览打开的文件不抢焦点，避免浏览代码时面板不停弹出
        if (problem && settings.autoShowPanel() && !isPreviewTab(filePath)) {
            void this.panel.focus();
        }

        this.panel.post({
            command: 'new-problem',
            problem,
            fileStatus,
            mainFilePath: srcPath,
            testFilePath: testPath,
            recentFiles: problem ? undefined : this.recent.list(),
        });
    }
}

function isPreviewTab(filePath: string): boolean {
    const tab = vscode.window.tabGroups.activeTabGroup.activeTab;
    return (
        tab !== undefined &&
        tab.isPreview &&
        tab.input instanceof vscode.TabInputText &&
        tab.input.uri.fsPath === filePath
    );
}
