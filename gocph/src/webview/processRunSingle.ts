import { Problem, RunResult } from '../common/types';
import { getLanguage } from '../utils/utils';
import { getBinSaveLocation, compileFile } from '../core/compiler';
import { saveProblemToTestFile } from '../core/testFileParser';
import { runTestCase, deleteBinary } from '../core/executions';
import { isResultCorrect } from '../core/judge';
import * as vscode from 'vscode';
import { getJudgeViewProvider } from '../common/shared';
import { getIgnoreSTDERRORPref } from '../common/preferences';

export const runSingleAndSave = async (
    problem: Problem,
    id: number,
    skipCompile = false,
) => {
    globalThis.logger.log('Run and save started', problem, id);
    const srcPath = problem.srcPath;
    const language = getLanguage(srcPath);
    const binPath = getBinSaveLocation(srcPath);
    const idx = problem.tests.findIndex((value) => value.id === id);
    const testCase = problem.tests[idx];

    if (!skipCompile) {
        getJudgeViewProvider().extensionToJudgeViewMessage({
            command: 'running',
            id: id,
            problem: problem,
        });
    }

    const textEditor = await vscode.workspace.openTextDocument(srcPath);
    await vscode.window.showTextDocument(textEditor, vscode.ViewColumn.One);
    await textEditor.save();

    if (!testCase) {
        globalThis.logger.error('Invalid id', id, problem);
        return;
    }

    saveProblemToTestFile(srcPath, problem);

    if (!skipCompile) {
        if (!(await compileFile(srcPath))) {
            globalThis.logger.error('Failed to compile', problem, id);
            return;
        }
    }

    const run = await runTestCase(language, binPath, testCase.input);

    if (!skipCompile) {
        deleteBinary(language, binPath);
    }

    const stderrorFailure = getIgnoreSTDERRORPref() ? false : run.stderr !== '';

    const didError =
        (run.code !== null && run.code !== 0) ||
        run.signal !== null ||
        stderrorFailure;
    const result: RunResult = {
        ...run,
        pass: didError ? false : isResultCorrect(testCase, run.stdout),
        id,
    };

    globalThis.logger.log('Testcase judging complete. Result:', result);
    getJudgeViewProvider().extensionToJudgeViewMessage({
        command: 'run-single-result',
        result,
        problem,
    });

    if (!skipCompile) {
        getJudgeViewProvider().extensionToJudgeViewMessage({
            command: 'not-running',
        });
    }
};
