import * as vscode from 'vscode';
import * as fs from 'fs';
import { checkUnsupported, randomId } from './utils';
import { Problem } from './types';
import { getProblem } from './parser';
import { compileFile } from './compiler';
import runAllAndSave from './webview/processRunAll';
import path from 'path';
import { getJudgeViewProvider } from './extension';
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
        checkUnsupported('');
        return;
    }
    const srcPath = editor.document.fileName;
    if (checkUnsupported(srcPath)) {
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
