import * as vscode from 'vscode';
import { existsSync } from 'fs';
import { getJudgeViewProvider, foldRegionsInActiveEditor } from '../extension';
import { getProblemForDocument, getFileStatus, getMainFileFromTestFile } from '../utils';
import { getAutoShowJudgePref } from '../preferences';
import { getTestFilePath, getProblemFromTestFile } from '../testFileParser';

/**
 * 当编辑器切换时，显示对应的问题详情
 */
export const editorChanged = async (e: vscode.TextEditor | undefined) => {
    globalThis.logger.log('切换编辑器到', e?.document.fileName);

    if (e === undefined) {
        getJudgeViewProvider().extensionToJudgeViewMessage({
            command: 'new-problem',
            problem: undefined,
            fileStatus: 'no-file',
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
    } else if (fileStatus === 'valid') {
        mainFilePath = srcPath;
        testFilePath = getTestFilePath(srcPath);
    }

    const problem = getProblemForDocument(e.document);

    if (problem === undefined) {
        getJudgeViewProvider().extensionToJudgeViewMessage({
            command: 'new-problem',
            problem: undefined,
            fileStatus,
            mainFilePath,
            testFilePath,
        });
        return;
    }

    if (
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
