import * as vscode from 'vscode';
import * as fs from 'fs';
import { checkUnsupported, randomId, isValidLanguage } from './utils';
import { Problem } from './types';
import { getProblem } from './parser';
import { compileFile } from './compiler';
import runAllAndSave from './webview/processRunAll';
import path from 'path';
import { getJudgeViewProvider, foldRegionsInActiveEditor } from './shared';
import { getTestFilePath } from './testFileParser';
import { generateTestGo } from './templateGenerator';

/**
 * Execution for the run testcases command. Runs all testcases for the active
 * editor. If the active editor does not have any saved testaces, creates an
 * empty testcases file and shows it in the results section.
 */
export default async () => {
    globalThis.logger.log('Running command "runTestCases"');
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) {
        return;
    }
    const srcPath = editor.document.fileName;
    if (!isValidLanguage(srcPath)) {
        getJudgeViewProvider().extensionToJudgeViewMessage({
            command: 'notification',
            text: '不支持的文件类型，仅支持 .go 文件',
            type: 'error',
        });
        return;
    }

    const problem = getProblem(srcPath);

    if (!problem) {
        globalThis.logger.log('No problem saved.');
        createLocalProblem(editor);
        return;
    }

    const didCompile = await compileFile(srcPath);

    if (!didCompile) {
        globalThis.logger.error('Could not compile', srcPath);
        return;
    }

    // 自动折叠 region
    await foldRegionsInActiveEditor();

    await editor.document.save();
    getJudgeViewProvider().focus();
    getJudgeViewProvider().extensionToJudgeViewMessage({
        command: 'new-problem',
        problem: problem,
    });
    runAllAndSave(problem);
    vscode.window.showTextDocument(editor.document, vscode.ViewColumn.One);
};

const createLocalProblem = async (editor: vscode.TextEditor) => {
    globalThis.logger.log('Creating local problem');
    const srcPath = editor.document.fileName;
    if (checkUnsupported(srcPath)) {
        return;
    }

    const problemName = 'Local: ' + path.basename(srcPath).split('.')[0];
    const newProblem: Problem = {
        name: problemName,
        url: srcPath,
        tests: [
            {
                id: randomId(null),
                input: '',
                output: '',
            },
        ],
        interactive: false,
        memoryLimit: 1024,
        timeLimit: 3000,
        srcPath,
        group: 'local',
        local: true,
    };

    // 创建 test 文件
    const testPath = getTestFilePath(srcPath);
    if (!fs.existsSync(testPath)) {
        fs.writeFileSync(testPath, generateTestGo({
            name: problemName,
            group: 'local',
            url: srcPath,
            tests: [{ input: '', output: '' }],
        }));
        globalThis.logger.log('创建本地测试文件:', testPath);
    }

    globalThis.logger.log(newProblem);
    getJudgeViewProvider().focus();
    getJudgeViewProvider().extensionToJudgeViewMessage({
        command: 'new-problem',
        problem: newProblem,
    });
};
