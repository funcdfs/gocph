import * as vscode from 'vscode';
import { existsSync } from 'fs';
import { getJudgeViewProvider, foldRegionsInActiveEditor } from '../extension';
import { getProblemForDocument, getFileStatus, getMainFileFromTestFile } from '../utils';
import { getAutoShowJudgePref } from '../preferences';
import { getTestFilePath, getProblemFromTestFile } from '../testFileParser';

/**
 * 当编辑器切换时，显示对应的问题详情
 */
const RECENT_FILES_KEY = 'gocph.recentFiles';
const MAX_RECENT_FILES = 5;

function updateRecentFiles(filePath: string) {
    if (!globalThis.context) return;
    let recent = globalThis.context.globalState.get<string[]>(RECENT_FILES_KEY, []);
    // 移除已存在的当前路径（为了置顶）
    recent = recent.filter(p => p !== filePath);
    // 插入到开头
    recent.unshift(filePath);
    // 截断
    if (recent.length > MAX_RECENT_FILES) {
        recent = recent.slice(0, MAX_RECENT_FILES);
    }
    globalThis.context.globalState.update(RECENT_FILES_KEY, recent);
}

function getRecentFiles(): string[] {
    if (!globalThis.context) return [];
    return globalThis.context.globalState.get<string[]>(RECENT_FILES_KEY, []);
}

export const editorChanged = async (e: vscode.TextEditor | undefined) => {
    globalThis.logger.log('切换编辑器到', e?.document.fileName);

    if (e === undefined) {
        getJudgeViewProvider().extensionToJudgeViewMessage({
            command: 'new-problem',
            problem: undefined,
            fileStatus: 'no-file',
            recentFiles: getRecentFiles(),
        });
        return;
    }

    if (e.document.uri.scheme !== 'file') {
        return;
    }

    const srcPath = e.document.fileName;
    const fileStatus = getFileStatus(e.document);

    let mainFilePath: string | undefined;
    let testFilePath: string | undefined;

    if (fileStatus === 'is-test-file') {
        mainFilePath = getMainFileFromTestFile(srcPath);
        testFilePath = srcPath;
        if (mainFilePath) updateRecentFiles(mainFilePath); // 记录关联的主文件
    } else if (fileStatus === 'valid') {
        mainFilePath = srcPath;
        testFilePath = getTestFilePath(srcPath);
        updateRecentFiles(srcPath); // 记录当前文件
    }

    const problem = getProblemForDocument(e.document);

    if (problem === undefined) {
        getJudgeViewProvider().extensionToJudgeViewMessage({
            command: 'new-problem',
            problem: undefined,
            fileStatus,
            mainFilePath,
            testFilePath,
            recentFiles: getRecentFiles(),
        });
        return;
    }

    // 检查是否在 preview 模式 (Git worktree 或单击文件预览)
    // 如果是 preview 模式，则不自动聚焦面板
    let isPreview = false;
    const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
    if (activeTab && activeTab.input instanceof vscode.TabInputText) {
        if (activeTab.input.uri.fsPath === srcPath && (activeTab as any).isPreview) {
            isPreview = true;
        }
    }
    // 备用检查：activeTab.isPreview 属性在 API 中存在
    if (activeTab && (activeTab as any).isPreview && activeTab.input instanceof vscode.TabInputText && activeTab.input.uri.fsPath === srcPath) {
        isPreview = true;
    }

    if (
        !isPreview &&
        getAutoShowJudgePref() &&
        getJudgeViewProvider().isViewUninitialized()
    ) {
        vscode.commands.executeCommand('gocph.judgeView.focus');
    }

    globalThis.logger.log('发送问题 @', Date.now());
    getJudgeViewProvider().extensionToJudgeViewMessage({
        command: 'new-problem',
        problem,
        fileStatus: 'valid',
        mainFilePath,
        testFilePath,
    });

    // 打开有效的 main.go 文件时，自动折叠 region
    if (fileStatus === 'valid' && problem) {
        triggerAutoFold();
    }
};

let foldTimeout: NodeJS.Timeout | undefined;
const AUTO_FOLD_DELAY = 2000; // 2s 延迟

/**
 * 自动折叠防抖处理
 */
function triggerAutoFold() {
    if (foldTimeout) {
        clearTimeout(foldTimeout);
    }
    foldTimeout = setTimeout(() => {
        foldRegionsInActiveEditor();
        foldTimeout = undefined;
    }, AUTO_FOLD_DELAY);
}

export const editorClosed = (e: vscode.TextDocument) => {
    globalThis.logger.log('关闭编辑器:', e.uri.fsPath);
    const srcPath = e.uri.fsPath;
    const testPath = getTestFilePath(srcPath);

    if (!existsSync(testPath)) {
        return;
    }

    const problem = getProblemFromTestFile(srcPath);

    if (problem && getJudgeViewProvider().problemPath === problem.srcPath) {
        getJudgeViewProvider().extensionToJudgeViewMessage({
            command: 'new-problem',
            problem: undefined,
            fileStatus: 'no-file',
        });
    }
};

export const checkLaunchWebview = () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    editorChanged(editor);
};
